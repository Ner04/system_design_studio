package com.app.dto;

import java.time.Instant;
import java.util.UUID;

public record DocumentResponse(
    UUID id, String title, String markdown, long version, Instant createdAt, Instant updatedAt) {}
