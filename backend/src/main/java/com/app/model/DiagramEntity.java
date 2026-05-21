package com.app.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "diagrams")
public class DiagramEntity {

  @Id private UUID id;

  @Column(nullable = false)
  private String title;

  @Lob
  @Column(nullable = false)
  private String graphJson;

  @Version private long version;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private Instant updatedAt;

  protected DiagramEntity() {}

  public DiagramEntity(UUID id, String title, String graphJson) {
    this.id = id;
    this.title = title;
    this.graphJson = graphJson;
  }

  @PrePersist
  void onCreate() {
    Instant now = Instant.now();
    createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getGraphJson() {
    return graphJson;
  }

  public void setGraphJson(String graphJson) {
    this.graphJson = graphJson;
  }

  public long getVersion() {
    return version;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
