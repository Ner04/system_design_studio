package com.app.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.UUID;

public record RealtimeDiagramEvent(
    @NotBlank String type, UUID diagramId, JsonNode payload, Instant timestamp) {
  public RealtimeDiagramEvent {
    timestamp = timestamp == null ? Instant.now() : timestamp;
  }
}
