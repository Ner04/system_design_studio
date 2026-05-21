package com.app.dto;

import jakarta.validation.constraints.NotBlank;

public record AiGenerateDiagramRequest(@NotBlank String prompt, String model) {}
