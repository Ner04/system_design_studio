package com.app.controller;

import com.app.ai.AiGenerationService;
import com.app.dto.AiGenerateDiagramRequest;
import com.app.dto.AiGenerateDocumentRequest;
import com.app.dto.AiGenerationResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiController {

  private final AiGenerationService aiGenerationService;

  public AiController(AiGenerationService aiGenerationService) {
    this.aiGenerationService = aiGenerationService;
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
