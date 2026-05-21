package com.app.repository;

import com.app.model.VersionHistoryEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VersionHistoryRepository extends JpaRepository<VersionHistoryEntity, UUID> {
  List<VersionHistoryEntity> findByArtifactIdOrderByCreatedAtDesc(UUID artifactId);
}
