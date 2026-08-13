package com.app;

import static org.assertj.core.api.Assertions.assertThat;

import com.app.ai.OllamaJsonSanitizer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class OllamaJsonSanitizerTest {

  private final OllamaJsonSanitizer sanitizer = new OllamaJsonSanitizer(new ObjectMapper());

  @Test
  void extractsFencedJsonAndDropsPositions() {
    String raw =
        """
        ```json
        {
          "nodes": [
            {
              "id": "API Gateway",
              "type": "gateway",
              "position": {"x": 10, "y": 20},
              "data": {"label": "API Gateway", "description": "Routes traffic"}
            },
            {
              "id": "orders",
              "type": "unknown",
              "data": {"label": "Order Service"}
            }
          ],
          "edges": [
            {"source": "API Gateway", "target": "orders", "label": "REST"},
            {"source": "missing", "target": "orders", "label": "bad"}
          ]
        }
        ```
        """;

    JsonNode graph = sanitizer.sanitizeGraph(raw).orElseThrow();

    assertThat(graph.get("nodes")).hasSize(2);
    assertThat(graph.get("nodes").get(0).has("position")).isFalse();
    assertThat(graph.get("nodes").get(0).get("id").asText()).isEqualTo("api-gateway");
    assertThat(graph.get("nodes").get(1).get("type").asText()).isEqualTo("service");
    assertThat(graph.get("edges")).hasSize(1);
  }

  @Test
  void keepsCloudProviderNodeTypesAndNormalizesLooseSpellings() {
    String raw =
        """
        {
          "nodes": [
            {"id": "cdn", "type": "cloudfront", "data": {"label": "CloudFront"}},
            {"id": "fn", "type": "lambda", "data": {"label": "Lambda"}},
            {"id": "lb", "type": "load_balancer", "data": {"label": "ALB"}},
            {"id": "gw", "type": "API Gateway", "data": {"label": "Gateway"}},
            {"id": "mystery", "type": "blockchain", "data": {"label": "Unknown"}}
          ],
          "edges": [{"source": "cdn", "target": "fn", "label": "invoke"}]
        }
        """;

    JsonNode graph = sanitizer.sanitizeGraph(raw).orElseThrow();

    assertThat(graph.get("nodes").get(0).get("type").asText()).isEqualTo("cloudfront");
    assertThat(graph.get("nodes").get(1).get("type").asText()).isEqualTo("lambda");
    assertThat(graph.get("nodes").get(2).get("type").asText()).isEqualTo("loadBalancer");
    assertThat(graph.get("nodes").get(3).get("type").asText()).isEqualTo("apiGateway");
    assertThat(graph.get("nodes").get(4).get("type").asText()).isEqualTo("service");
  }

  @Test
  void rejectsMissingNodesAndEdges() {
    assertThat(sanitizer.sanitizeGraph("{\"nodes\": []}")).isEmpty();
  }

  @Test
  void reportsNodesLeftStrandedWhenTheModelForgetsEdges() {
    // Shape is valid, so sanitizeGraph accepts it; only the structural check sees the islands.
    String raw =
        """
        {
          "nodes": [
            {"id": "client", "type": "mobile", "data": {"label": "Client"}},
            {"id": "gateway", "type": "gateway", "data": {"label": "Gateway"}},
            {"id": "orders", "type": "service", "data": {"label": "Order Service"}},
            {"id": "orders-db", "type": "database", "data": {"label": "Order DB"}},
            {"id": "reporting", "type": "service", "data": {"label": "Reporting"}}
          ],
          "edges": [
            {"source": "client", "target": "gateway", "label": "HTTPS"},
            {"source": "gateway", "target": "orders", "label": "REST"},
            {"source": "orders", "target": "orders-db", "label": "persist"}
          ]
        }
        """;

    JsonNode graph = sanitizer.sanitizeGraph(raw).orElseThrow();

    assertThat(sanitizer.structuralProblems(graph))
        .anySatisfy(problem -> assertThat(problem).contains("reporting"));
  }

  @Test
  void reportsGraphsThatSplitIntoSeparateIslands() {
    String raw =
        """
        {
          "nodes": [
            {"id": "client", "type": "mobile", "data": {"label": "Client"}},
            {"id": "gateway", "type": "gateway", "data": {"label": "Gateway"}},
            {"id": "worker", "type": "service", "data": {"label": "Worker"}},
            {"id": "worker-db", "type": "database", "data": {"label": "Worker DB"}}
          ],
          "edges": [
            {"source": "client", "target": "gateway", "label": "HTTPS"},
            {"source": "worker", "target": "worker-db", "label": "persist"}
          ]
        }
        """;

    JsonNode graph = sanitizer.sanitizeGraph(raw).orElseThrow();

    assertThat(sanitizer.structuralProblems(graph))
        .anySatisfy(problem -> assertThat(problem).contains("2 disconnected groups"));
  }

  @Test
  void acceptsAConnectedGraph() {
    String raw =
        """
        {
          "nodes": [
            {"id": "client", "type": "mobile", "data": {"label": "Client"}},
            {"id": "gateway", "type": "gateway", "data": {"label": "Gateway"}},
            {"id": "orders", "type": "service", "data": {"label": "Order Service"}},
            {"id": "orders-db", "type": "database", "data": {"label": "Order DB"}}
          ],
          "edges": [
            {"source": "client", "target": "gateway", "label": "HTTPS"},
            {"source": "gateway", "target": "orders", "label": "REST"},
            {"source": "orders", "target": "orders-db", "label": "persist"}
          ]
        }
        """;

    JsonNode graph = sanitizer.sanitizeGraph(raw).orElseThrow();

    assertThat(sanitizer.structuralProblems(graph)).isEmpty();
  }

  @Test
  void acceptsDeepseekThinkingWrapperAndNestedDiagramKey() {
    String raw =
        """
        <think>I should return JSON only.</think>
        {
          "diagram": {
            "nodes": [
              {"label": "API Gateway", "type": "gateway", "description": "Routes requests"},
              {"id": "orders-db", "type": "database", "data": {"label": "Orders DB"}}
            ],
            "edges": [
              {"source": "API Gateway", "target": "orders-db", "label": "SQL"}
            ]
          }
        }
        """;

    JsonNode graph = sanitizer.sanitizeGraph(raw).orElseThrow();

    assertThat(graph.get("nodes")).hasSize(2);
    assertThat(graph.get("nodes").get(0).get("id").asText()).isEqualTo("api-gateway");
    assertThat(graph.get("edges")).hasSize(1);
    assertThat(graph.get("edges").get(0).get("source").asText()).isEqualTo("api-gateway");
  }
}
