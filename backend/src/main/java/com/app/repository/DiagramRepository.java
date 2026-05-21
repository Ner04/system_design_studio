package com.app.repository;

import com.app.model.DiagramEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiagramRepository extends JpaRepository<DiagramEntity, UUID> {}
