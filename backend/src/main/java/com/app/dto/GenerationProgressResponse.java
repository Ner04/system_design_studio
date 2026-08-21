package com.app.dto;

/**
 * @param active false once the generation has finished or the id was never seen, which tells the
 *     client to stop polling
 * @param partialMarkdown the document as written so far, so the client can render sections as they
 *     complete rather than waiting for the whole generation
 */
public record GenerationProgressResponse(
    boolean active, int completed, int total, String currentStep, String partialMarkdown) {}
