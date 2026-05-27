package com.app.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.HashSet;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class OllamaJsonSanitizer {

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
          "websocket");

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

        String type = textAt(node, "type").orElse("service");
        if (!ALLOWED_NODE_TYPES.contains(type)) {
          type = "service";
        }

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

  private String slug(String value) {
    String slug = value.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    return slug.isBlank() ? "node" : slug;
  }

  private String truncate(String value, int maxLength) {
    return value.length() <= maxLength ? value : value.substring(0, maxLength).trim();
  }
}
