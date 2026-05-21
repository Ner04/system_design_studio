package com.app.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.UUID;

public record DiagramResponse(
    UUID id, String title, JsonNode graph, long version, Instant createdAt, Instant updatedAt) {}
