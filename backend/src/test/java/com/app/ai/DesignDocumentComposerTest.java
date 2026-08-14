package com.app.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class DesignDocumentComposerTest {

  private final OllamaClient ollamaClient = mock(OllamaClient.class);
  private final GenerationProgressTracker progressTracker = new GenerationProgressTracker();
  private final DesignDocumentComposer composer =
      new DesignDocumentComposer(
          ollamaClient, progressTracker, new CapacityEstimator(ollamaClient, new ObjectMapper()));
  private final List<String> observedSteps = new ArrayList<>();

  @Test
  void interviewModeNumbersTheSectionsAnInterviewActuallyScores() {
    when(ollamaClient.generate(anyString(), anyString(), anyBoolean())).thenReturn("Section body.");

    String document = composer.compose("Ride Hailing", "design uber", "qwen");

    assertThat(document).startsWith("# Technical Design Document: Ride Hailing");
    assertThat(document)
        .contains(
            "## 1. Problem and Requirements",
            "## 2. Capacity Estimation",
            "## 3. High-Level Architecture",
            "## 4. Data Model and Schema",
            "## 5. API Design",
            "## 6. Deep Dive: The Hard Part",
            "## 7. Tradeoffs",
            "## 8. Bottlenecks and Failure Modes",
            "## 9. Interview Discussion Points");
  }

  @Test
  void interviewModeLeavesOutTheSectionsNoInterviewerAsksAbout() {
    when(ollamaClient.generate(anyString(), anyString(), anyBoolean())).thenReturn("Section body.");

    String document = composer.compose("Ride Hailing", "design uber", "qwen");

    assertThat(document)
        .doesNotContain("Testing Strategy", "Rollout Plan", "Appendix", "Security Considerations");
  }

  @Test
  void deliveryModeAppendsTheOperationalSectionsAndKeepsNumberingSequential() {
    when(ollamaClient.generate(anyString(), anyString(), anyBoolean())).thenReturn("Section body.");

    String document =
        composer.compose("Ride Hailing", "design uber", "qwen", null, DocumentMode.DELIVERY);

    assertThat(document)
        .contains(
            "## 9. Interview Discussion Points",
            "## 10. Security Considerations",
            "## 11. Testing Strategy",
            "## 12. Rollout Plan",
            "## 13. Appendix");
  }

  @Test
  void capacitySectionIsComputedRatherThanWrittenByTheModel() {
    // generateStructured is unstubbed and returns null, so the estimator falls back to its
    // default assumptions - and must still render a complete, arithmetically sound table.
    when(ollamaClient.generate(anyString(), anyString(), anyBoolean())).thenReturn("Section body.");

    String document = composer.compose("Ride Hailing", "design uber", "qwen");

    assertThat(document).contains("| Daily active users | 10M |");
    assertThat(document).contains("Average throughput = 100M / 86,400 s = **1.2K/s**");
  }

  @Test
  void dropsRepeatedHeadingsAndPreamblesFromModelOutput() {
    when(ollamaClient.generate(anyString(), anyString(), anyBoolean()))
        .thenReturn(
            """
            Sure, here is the section you asked for:

            ## 1. Problem and Requirements

            ### Functional Requirements
            Riders can request a trip.
            """);

    String document = composer.compose("Ride Hailing", "design uber", "qwen");

    assertThat(document).contains("Riders can request a trip.");
    assertThat(document).doesNotContain("Sure, here is the section");
    // The composer prints the numbered heading itself, so the model's copy must not survive.
    assertThat(document.split("## 1\\. Problem and Requirements", -1)).hasSize(2);
    // Subheadings are the model's to own and must be preserved.
    assertThat(document).contains("### Functional Requirements");
  }

  @Test
  void derivesTheDependencyTableFromTechnologiesTheDocumentMentions() {
    when(ollamaClient.generate(anyString(), anyString(), anyBoolean()))
        .thenReturn("Events flow through Apache Kafka and hot lookups are served from Redis.");

    String document =
        composer.compose("Ride Hailing", "design uber", "qwen", null, DocumentMode.DELIVERY);

    assertThat(document).contains("| Apache Kafka | 3.5+ | Event streaming |");
    assertThat(document).contains("| Redis | 7.0+ | Caching and hot lookups |");
    assertThat(document).doesNotContain("| Apache Cassandra |");
  }

  @Test
  void reportsProgressWhileWritingAndClearsItAfterwards() {
    // Captures what a poll would have seen partway through, since generation is synchronous.
    when(ollamaClient.generate(anyString(), anyString(), anyBoolean()))
        .thenAnswer(
            invocation -> {
              observedSteps.add(
                  progressTracker
                      .progressFor("req-1")
                      .map(GenerationProgressTracker.Progress::currentStep)
                      .orElse("none"));
              return "Section body.";
            });

    composer.compose("Ride Hailing", "design uber", "qwen", "req-1", DocumentMode.INTERVIEW);

    assertThat(observedSteps).startsWith("Problem and Requirements");
    assertThat(observedSteps).contains("Deep Dive: The Hard Part");
    assertThat(progressTracker.progressFor("req-1")).isEmpty();
  }

  @Test
  void clearsProgressEvenWhenGenerationFails() {
    when(ollamaClient.generate(anyString(), anyString(), anyBoolean()))
        .thenThrow(new IllegalStateException("ollama is down"));

    assertThatThrownBy(
            () -> composer.compose("Ride Hailing", "design uber", "qwen", "req-2", DocumentMode.INTERVIEW))
        .isInstanceOf(IllegalStateException.class);

    assertThat(progressTracker.progressFor("req-2")).isEmpty();
  }

  @Test
  void failsWhenEveryProseSectionFallsBackSoTheCallerCanUseTheMockInstead() {
    // The capacity section still renders from defaults, so it must not count as success.
    when(ollamaClient.generate(anyString(), anyString(), anyBoolean()))
        .thenThrow(new IllegalStateException("ollama is down"));

    assertThatThrownBy(() -> composer.compose("Ride Hailing", "design uber", "qwen"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("Ollama produced nothing");
  }
}
