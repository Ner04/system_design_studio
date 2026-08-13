package com.app.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashSet;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class OllamaJsonSanitizer {

  /**
   * A smaller local model often emits nodes it never wires up. Below this count the result
   * reads as a fragment rather than an architecture, so it is worth another attempt.
   */
  private static final int MINIMUM_USABLE_NODES = 4;

  /**
   * Mirrors ArchitectureNodeType in the frontend. A type the frontend cannot render
   * would show up with no icon, so anything unrecognised is coerced to "service".
   */
  private static final Set<String> ALLOWED_NODE_TYPES =
      Set.of(
          "service",
          "database",
          "cache",
          "queue",
          "gateway",
          "mobile",
          "cdn",
          "loadBalancer",
          "kafka",
          "redis",
          "websocket",
          "aws",
          "ec2",
          "lambda",
          "ecs",
          "eks",
          "s3",
          "rds",
          "dynamodb",
          "opensearch",
          "cloudfront",
          "apiGateway",
          "sqs",
          "sns",
          "vpc");

  /**
   * Models rarely reproduce the exact camelCase spelling, so "load_balancer" and
   * "Load Balancer" resolve to "loadBalancer" instead of collapsing to "service".
   */
  private static final Map<String, String> NODE_TYPE_BY_NORMALIZED_NAME =
      ALLOWED_NODE_TYPES.stream()
          .collect(Collectors.toMap(OllamaJsonSanitizer::normalizeTypeName, type -> type));

  private final ObjectMapper objectMapper;

  public OllamaJsonSanitizer(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public Optional<JsonNode> sanitizeGraph(String rawResponse) {
    try {
      JsonNode root = objectMapper.readTree(extractJsonObject(rawResponse));
      JsonNode graph = graphNode(root);
      if (!graph.has("nodes") || !graph.get("nodes").isArray()) {
        return Optional.empty();
      }
      if (!graph.has("edges") || !graph.get("edges").isArray()) {
        return Optional.empty();
      }

      ObjectNode sanitized = objectMapper.createObjectNode();
      ArrayNode nodes = objectMapper.createArrayNode();
      ArrayNode edges = objectMapper.createArrayNode();
      Set<String> nodeIds = new HashSet<>();
      Map<String, String> nodeAliases = new HashMap<>();

      for (JsonNode node : graph.get("nodes")) {
        String label = textAt(node, "data", "label").orElseGet(() -> textAt(node, "label").orElse("Service"));
        Optional<String> originalId = textAt(node, "id");
        String id = textAt(node, "id").map(this::slug).orElseGet(() -> slug(label));
        if (id.isBlank() || nodeIds.contains(id)) {
          id = "node-" + (nodes.size() + 1);
        }
        nodeIds.add(id);
        String sanitizedId = id;
        originalId.map(this::slug).ifPresent(alias -> nodeAliases.put(alias, sanitizedId));
        nodeAliases.put(slug(label), sanitizedId);

        String type = resolveNodeType(textAt(node, "type").orElse("service"));

        ObjectNode data = objectMapper.createObjectNode();
        data.put("label", truncate(label, 80));
        textAt(node, "data", "description")
            .or(() -> textAt(node, "description"))
            .ifPresent(description -> data.put("description", truncate(description, 180)));

        ObjectNode sanitizedNode = objectMapper.createObjectNode();
        sanitizedNode.put("id", id);
        sanitizedNode.put("type", type);
        sanitizedNode.set("data", data);
        nodes.add(sanitizedNode);
      }

      for (JsonNode edge : graph.get("edges")) {
        Optional<String> source = textAt(edge, "source").map(this::slug).map(nodeAliases::get);
        Optional<String> target = textAt(edge, "target").map(this::slug).map(nodeAliases::get);
        if (source.isEmpty()
            || target.isEmpty()
            || !nodeIds.contains(source.get())
            || !nodeIds.contains(target.get())) {
          continue;
        }

        ObjectNode sanitizedEdge = objectMapper.createObjectNode();
        sanitizedEdge.put("source", source.get());
        sanitizedEdge.put("target", target.get());
        textAt(edge, "label").ifPresent(label -> sanitizedEdge.put("label", truncate(label, 50)));
        edges.add(sanitizedEdge);
      }

      sanitized.set("nodes", nodes);
      sanitized.set("edges", edges);
      return nodes.isEmpty() ? Optional.empty() : Optional.of(sanitized);
    } catch (Exception exception) {
      return Optional.empty();
    }
  }

  /**
   * Shape coercion in {@link #sanitizeGraph} cannot tell a sparse architecture from a broken one:
   * it drops edges pointing at ids that do not exist, which quietly leaves nodes stranded. A graph
   * of islands renders as scattered boxes with no flow to read, so the caller retries on these
   * problems instead of showing them. Returns an empty list when the graph is usable.
   */
  public List<String> structuralProblems(JsonNode graph) {
    List<String> problems = new ArrayList<>();
    if (graph == null || !graph.has("nodes") || !graph.get("nodes").isArray()) {
      return List.of("graph has no nodes array");
    }

    List<String> nodeIds = new ArrayList<>();
    for (JsonNode node : graph.get("nodes")) {
      textAt(node, "id").ifPresent(nodeIds::add);
    }
    if (nodeIds.size() < MINIMUM_USABLE_NODES) {
      problems.add("only %d node(s), expected at least %d".formatted(nodeIds.size(), MINIMUM_USABLE_NODES));
    }

    Map<String, Set<String>> adjacency = new HashMap<>();
    nodeIds.forEach(id -> adjacency.put(id, new LinkedHashSet<>()));
    JsonNode edges = graph.get("edges");
    if (edges != null && edges.isArray()) {
      for (JsonNode edge : edges) {
        Optional<String> source = textAt(edge, "source");
        Optional<String> target = textAt(edge, "target");
        if (source.isPresent()
            && target.isPresent()
            && adjacency.containsKey(source.get())
            && adjacency.containsKey(target.get())) {
          adjacency.get(source.get()).add(target.get());
          adjacency.get(target.get()).add(source.get());
        }
      }
    }

    List<String> orphans =
        nodeIds.stream().filter(id -> adjacency.get(id).isEmpty()).sorted().toList();
    if (!orphans.isEmpty()) {
      problems.add("unconnected node(s): " + String.join(", ", orphans));
    }

    int components = countComponents(nodeIds, adjacency);
    if (components > 1) {
      problems.add("graph splits into %d disconnected groups".formatted(components));
    }
    return problems;
  }

  private int countComponents(List<String> nodeIds, Map<String, Set<String>> adjacency) {
    Set<String> visited = new HashSet<>();
    int components = 0;
    for (String nodeId : nodeIds) {
      if (!visited.add(nodeId)) {
        continue;
      }
      components++;
      Deque<String> queue = new ArrayDeque<>();
      queue.add(nodeId);
      while (!queue.isEmpty()) {
        for (String neighbour : adjacency.get(queue.poll())) {
          if (visited.add(neighbour)) {
            queue.add(neighbour);
          }
        }
      }
    }
    return components;
  }

  private JsonNode graphNode(JsonNode root) {
    if (root.has("graph")) {
      return root.get("graph");
    }
    if (root.has("diagram")) {
      return root.get("diagram");
    }
    if (root.has("architecture")) {
      return root.get("architecture");
    }
    return root;
  }

  private String extractJsonObject(String rawResponse) {
    String cleaned = rawResponse.trim();
    cleaned = cleaned.replaceAll("(?s)<think>.*?</think>", "").trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replaceFirst("(?s)^```(?:json)?\\s*", "").replaceFirst("(?s)\\s*```$", "");
    }

    int start = cleaned.indexOf('{');
    int end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return cleaned.substring(start, end + 1);
    }
    return cleaned;
  }

  private Optional<String> textAt(JsonNode node, String field) {
    JsonNode value = node.get(field);
    return value != null && value.isTextual() && !value.asText().isBlank()
        ? Optional.of(value.asText().trim())
        : Optional.empty();
  }

  private Optional<String> textAt(JsonNode node, String parent, String field) {
    JsonNode parentNode = node.get(parent);
    if (parentNode == null || !parentNode.isObject()) {
      return Optional.empty();
    }
    return textAt(parentNode, field);
  }

  private String resolveNodeType(String requestedType) {
    if (ALLOWED_NODE_TYPES.contains(requestedType)) {
      return requestedType;
    }
    return NODE_TYPE_BY_NORMALIZED_NAME.getOrDefault(normalizeTypeName(requestedType), "service");
  }

  private static String normalizeTypeName(String value) {
    return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
  }

  private String slug(String value) {
    String slug = value.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    return slug.isBlank() ? "node" : slug;
  }

  private String truncate(String value, int maxLength) {
    return value.length() <= maxLength ? value : value.substring(0, maxLength).trim();
  }
}
