package com.app.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "version_history")
public class VersionHistoryEntity {

  public enum ArtifactType {
    DIAGRAM,
    DOCUMENT
  }

  @Id @GeneratedValue private UUID id;

  @Column(nullable = false)
  private UUID artifactId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ArtifactType artifactType;

  @Column(nullable = false)
  private long artifactVersion;

  @Lob
  @Column(nullable = false)
  private String snapshot;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  protected VersionHistoryEntity() {}

  public VersionHistoryEntity(
      UUID artifactId, ArtifactType artifactType, long artifactVersion, String snapshot) {
    this.artifactId = artifactId;
    this.artifactType = artifactType;
    this.artifactVersion = artifactVersion;
    this.snapshot = snapshot;
  }

  @PrePersist
  void onCreate() {
    createdAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public UUID getArtifactId() {
    return artifactId;
  }

  public ArtifactType getArtifactType() {
    return artifactType;
  }

  public long getArtifactVersion() {
    return artifactVersion;
  }

  public String getSnapshot() {
    return snapshot;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
