package com.app.controller;

import com.app.dto.DiagramResponse;
import com.app.dto.DiagramSaveRequest;
import com.app.service.DiagramService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/diagram")
public class DiagramController {

  private final DiagramService diagramService;

  public DiagramController(DiagramService diagramService) {
    this.diagramService = diagramService;
  }

  @PostMapping("/save")
  public DiagramResponse save(@Valid @RequestBody DiagramSaveRequest request) {
    return diagramService.save(request);
  }

  @GetMapping("/{id}")
  public DiagramResponse get(@PathVariable UUID id) {
    return diagramService.get(id);
  }
}
