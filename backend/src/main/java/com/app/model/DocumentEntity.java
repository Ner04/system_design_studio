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
@Table(name = "documents")
public class DocumentEntity {

  @Id private UUID id;

  @Column(nullable = false)
  private String title;

  @Lob
  @Column(nullable = false)
  private String markdown;

  @Version private long version;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private Instant updatedAt;

  protected DocumentEntity() {}

  public DocumentEntity(UUID id, String title, String markdown) {
    this.id = id;
    this.title = title;
    this.markdown = markdown;
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

  public String getMarkdown() {
    return markdown;
  }

  public void setMarkdown(String markdown) {
    this.markdown = markdown;
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
