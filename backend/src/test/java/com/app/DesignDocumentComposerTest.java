package com.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.app.ai.DesignDocumentComposer;
import com.app.ai.OllamaClient;
import org.junit.jupiter.api.Test;

class DesignDocumentComposerTest {

  private final OllamaClient ollamaClient = mock(OllamaClient.class);
  private final DesignDocumentComposer composer = new DesignDocumentComposer(ollamaClient);

  @Test
  void keepsTheFixedNumberingAndAppendsTheDeterministicSections() {
    when(ollamaClient.generate(anyString(), anyString(), anyBoolean())).thenReturn("Section body.");

    String document = composer.compose("Ride Hailing", "design uber", "qwen");

    assertThat(document).startsWith("# Technical Design Document: Ride Hailing");
    assertThat(document)
        .contains(
            "## 1. Overview",
            "## 2. Goals and Non-Goals",
            "## 3. Architecture",
            "## 4. Data Model",
            "## 5. API Design",
            "## 6. Security Considerations",
            // Sections 7 to 9 are written here rather than generated, so they are always present.
            "## 7. Testing Strategy",
            "## 8. Rollout Plan",
            "## 9. Appendix",
            "### 9.2 Dependencies");
  }

  @Test
  void dropsRepeatedHeadingsAndPreamblesFromModelOutput() {
    when(ollamaClient.generate(anyString(), anyString(), anyBoolean()))
        .thenReturn(
            """
            Sure, here is the section you asked for:

            ## 1. Overview

            ### 1.1 Background
            The system matches riders to drivers.
            """);

    String document = composer.compose("Ride Hailing", "design uber", "qwen");

    assertThat(document).contains("The system matches riders to drivers.");
    assertThat(document).doesNotContain("Sure, here is the section");
    // The composer prints "## 1. Overview" itself, so the model's copy must not survive.
    assertThat(document.split("## 1\\. Overview", -1)).hasSize(2);
    // Subsection headings are the model's to own and must be preserved.
    assertThat(document).contains("### 1.1 Background");
  }

  @Test
  void derivesTheDependencyTableFromTechnologiesTheDocumentMentions() {
    when(ollamaClient.generate(anyString(), anyString(), anyBoolean()))
        .thenReturn("Events flow through Apache Kafka and hot lookups are served from Redis.");

    String document = composer.compose("Ride Hailing", "design uber", "qwen");

    assertThat(document).contains("| Apache Kafka | 3.5+ | Event streaming |");
    assertThat(document).contains("| Redis | 7.0+ | Caching and hot lookups |");
    assertThat(document).doesNotContain("| Apache Cassandra |");
  }

  @Test
  void failsWhenEverySectionFallsBackSoTheCallerCanUseTheMockInstead() {
    when(ollamaClient.generate(anyString(), anyString(), anyBoolean()))
        .thenThrow(new IllegalStateException("ollama is down"));

    assertThatThrownBy(() -> composer.compose("Ride Hailing", "design uber", "qwen"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("Ollama produced nothing");
  }
}
