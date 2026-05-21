package com.app.dto;

import jakarta.validation.constraints.NotBlank;

public record AiGenerateDocumentRequest(@NotBlank String prompt, String model) {}
