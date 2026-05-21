package com.app.repository;

import com.app.model.DocumentEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentRepository extends JpaRepository<DocumentEntity, UUID> {}
