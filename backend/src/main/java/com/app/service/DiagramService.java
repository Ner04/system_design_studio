package com.app.service;

import com.app.dto.DiagramResponse;
import com.app.dto.DiagramSaveRequest;
import com.app.model.DiagramEntity;
import com.app.model.VersionHistoryEntity;
import com.app.repository.DiagramRepository;
import com.app.repository.VersionHistoryRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DiagramService {

  private final DiagramRepository diagramRepository;
  private final VersionHistoryRepository versionHistoryRepository;
  private final ObjectMapper objectMapper;

  public DiagramService(
      DiagramRepository diagramRepository,
      VersionHistoryRepository versionHistoryRepository,
      ObjectMapper objectMapper) {
    this.diagramRepository = diagramRepository;
    this.versionHistoryRepository = versionHistoryRepository;
    this.objectMapper = objectMapper;
  }

  @Transactional
  public DiagramResponse save(DiagramSaveRequest request) {
    UUID id = request.id() == null ? UUID.randomUUID() : request.id();
    String graphJson = toJson(request.graph());
    DiagramEntity entity =
        diagramRepository
            .findById(id)
            .map(
                existing -> {
                  snapshot(existing);
                  existing.setTitle(request.title());
                  existing.setGraphJson(graphJson);
                  return existing;
                })
            .orElseGet(() -> new DiagramEntity(id, request.title(), graphJson));

    return toResponse(diagramRepository.save(entity));
  }

  @Transactional(readOnly = true)
  public DiagramResponse get(UUID id) {
    return diagramRepository
        .findById(id)
        .map(this::toResponse)
        .orElseThrow(() -> new EntityNotFoundException("Diagram not found: " + id));
  }

  private void snapshot(DiagramEntity entity) {
    versionHistoryRepository.save(
        new VersionHistoryEntity(
            entity.getId(),
            VersionHistoryEntity.ArtifactType.DIAGRAM,
            entity.getVersion(),
            entity.getGraphJson()));
  }

  private DiagramResponse toResponse(DiagramEntity entity) {
    return new DiagramResponse(
        entity.getId(),
        entity.getTitle(),
        fromJson(entity.getGraphJson()),
        entity.getVersion(),
        entity.getCreatedAt(),
        entity.getUpdatedAt());
  }

  private String toJson(JsonNode graph) {
    try {
      return objectMapper.writeValueAsString(graph);
    } catch (JsonProcessingException exception) {
      throw new IllegalArgumentException("Invalid graph JSON", exception);
    }
  }

  private JsonNode fromJson(String graphJson) {
    try {
      return objectMapper.readTree(graphJson);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException("Stored graph JSON is invalid", exception);
    }
  }
}
