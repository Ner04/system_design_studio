package com.app.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record DocumentSaveRequest(UUID id, @NotBlank String title, @NotBlank String markdown) {}
