package com.app.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record DiagramSaveRequest(UUID id, @NotBlank String title, @NotNull JsonNode graph) {}
