package com.app.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

public record AiGenerationResponse(
    String status,
    String message,
    String model,
    String title,
    JsonNode graph,
    String markdown,
    List<String> explanation,
    List<String> interviewQuestions) {}
