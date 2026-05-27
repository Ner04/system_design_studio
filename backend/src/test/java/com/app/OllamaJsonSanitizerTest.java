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
  void rejectsMissingNodesAndEdges() {
    assertThat(sanitizer.sanitizeGraph("{\"nodes\": []}")).isEmpty();
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
