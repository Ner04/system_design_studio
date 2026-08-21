package com.app.controller;

import com.app.ai.AiGenerationService;
import com.app.ai.GenerationProgressTracker;
import com.app.dto.AiGenerateDiagramRequest;
import com.app.dto.AiGenerateDocumentRequest;
import com.app.dto.AiGenerationResponse;
import com.app.dto.GenerationProgressResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiController {

  private final AiGenerationService aiGenerationService;
  private final GenerationProgressTracker progressTracker;

  public AiController(
      AiGenerationService aiGenerationService, GenerationProgressTracker progressTracker) {
    this.aiGenerationService = aiGenerationService;
    this.progressTracker = progressTracker;
  }

  /**
   * Polled by the browser while a document is being written. An unknown id reports inactive,
   * which is also what a finished generation looks like, so the client can stop either way.
   */
  @GetMapping("/progress/{requestId}")
  public GenerationProgressResponse progress(@PathVariable String requestId) {
    return progressTracker
        .progressFor(requestId)
        .map(
            progress ->
                new GenerationProgressResponse(
                    true,
                    progress.completed(),
                    progress.total(),
                    progress.currentStep(),
                    progress.partialMarkdown()))
        .orElseGet(() -> new GenerationProgressResponse(false, 0, 0, "", ""));
  }

  @PostMapping("/generate-diagram")
  public AiGenerationResponse generateDiagram(@Valid @RequestBody AiGenerateDiagramRequest request) {
    return aiGenerationService.generateDiagram(request);
  }

  @PostMapping("/generate-document")
  public AiGenerationResponse generateDocument(
      @Valid @RequestBody AiGenerateDocumentRequest request) {
    return aiGenerationService.generateDocument(request);
  }
}
