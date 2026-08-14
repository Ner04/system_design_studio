package com.app.dto;

/**
 * @param active false once the generation has finished or the id was never seen, which tells the
 *     client to stop polling.
 */
public record GenerationProgressResponse(
    boolean active, int completed, int total, String currentStep) {}
