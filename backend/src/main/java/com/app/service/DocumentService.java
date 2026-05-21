package com.app.service;

import com.app.dto.DocumentResponse;
import com.app.dto.DocumentSaveRequest;
import com.app.model.DocumentEntity;
import com.app.model.VersionHistoryEntity;
import com.app.repository.DocumentRepository;
import com.app.repository.VersionHistoryRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DocumentService {

  private final DocumentRepository documentRepository;
  private final VersionHistoryRepository versionHistoryRepository;

  public DocumentService(
      DocumentRepository documentRepository, VersionHistoryRepository versionHistoryRepository) {
    this.documentRepository = documentRepository;
    this.versionHistoryRepository = versionHistoryRepository;
  }

  @Transactional
  public DocumentResponse save(DocumentSaveRequest request) {
    UUID id = request.id() == null ? UUID.randomUUID() : request.id();
    DocumentEntity entity =
        documentRepository
            .findById(id)
            .map(
                existing -> {
                  snapshot(existing);
                  existing.setTitle(request.title());
                  existing.setMarkdown(request.markdown());
                  return existing;
                })
            .orElseGet(() -> new DocumentEntity(id, request.title(), request.markdown()));

    return toResponse(documentRepository.save(entity));
  }

  @Transactional(readOnly = true)
  public DocumentResponse get(UUID id) {
    return documentRepository
        .findById(id)
        .map(this::toResponse)
        .orElseThrow(() -> new EntityNotFoundException("Document not found: " + id));
  }

  private void snapshot(DocumentEntity entity) {
    versionHistoryRepository.save(
        new VersionHistoryEntity(
            entity.getId(),
            VersionHistoryEntity.ArtifactType.DOCUMENT,
            entity.getVersion(),
            entity.getMarkdown()));
  }

  private DocumentResponse toResponse(DocumentEntity entity) {
    return new DocumentResponse(
        entity.getId(),
        entity.getTitle(),
        entity.getMarkdown(),
        entity.getVersion(),
        entity.getCreatedAt(),
        entity.getUpdatedAt());
  }
}
