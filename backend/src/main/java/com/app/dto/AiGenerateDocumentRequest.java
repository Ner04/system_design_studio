package com.app.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * @param requestId optional, supplied by the browser so it can poll for progress while the
 *     document is written section by section
 * @param mode "INTERVIEW" (default) or "DELIVERY"; decides which sections the document contains
 */
public record AiGenerateDocumentRequest(
    @NotBlank String prompt, String model, String requestId, String mode) {}
