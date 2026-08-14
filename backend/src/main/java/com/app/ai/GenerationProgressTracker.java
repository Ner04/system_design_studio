package com.app.ai;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Records how far a document generation has got so the browser can show something more useful
 * than a two-minute spinner.
 *
 * <p>Progress is written by the thread serving the generate request and read by separate polling
 * requests, so entries live in a concurrent map keyed by a client-supplied request id. Entries are
 * removed when a generation finishes; anything left behind by a dropped connection is swept on the
 * next write so an abandoned request cannot pin memory forever.
 */
@Component
public class GenerationProgressTracker {

  private static final Duration STALE_AFTER = Duration.ofMinutes(15);

  public record Progress(int completed, int total, String currentStep, Instant updatedAt) {}

  private final Map<String, Progress> progressByRequestId = new ConcurrentHashMap<>();

  public void start(String requestId, int total, String firstStep) {
    if (isBlank(requestId)) {
      return;
    }
    evictStaleEntries();
    progressByRequestId.put(requestId, new Progress(0, total, firstStep, Instant.now()));
  }

  public void update(String requestId, int completed, int total, String currentStep) {
    if (isBlank(requestId)) {
      return;
    }
    progressByRequestId.put(requestId, new Progress(completed, total, currentStep, Instant.now()));
  }

  public void finish(String requestId) {
    if (!isBlank(requestId)) {
      progressByRequestId.remove(requestId);
    }
  }

  public Optional<Progress> progressFor(String requestId) {
    return isBlank(requestId) ? Optional.empty() : Optional.ofNullable(progressByRequestId.get(requestId));
  }

  private void evictStaleEntries() {
    Instant cutoff = Instant.now().minus(STALE_AFTER);
    progressByRequestId.entrySet().removeIf(entry -> entry.getValue().updatedAt().isBefore(cutoff));
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
