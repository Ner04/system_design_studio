package com.app.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class CapacityEstimatorTest {

  private final CapacityEstimator estimator =
      new CapacityEstimator(mock(OllamaClient.class), new ObjectMapper());

  @Test
  void derivesEveryTrafficFigureFromTheAssumptions() {
    // 10M users x 5 = 50M/day; 50M / 86,400 = 578/s; peak = 578 x 10 = 5,780/s.
    String section = estimator.render(assumptions(10_000_000L, 5, 20, 1_000, 10, "searches"));

    assertThat(section).contains("Total searches per day = 10M users x 5 = **50M**");
    assertThat(section).contains("Average throughput = 50M / 86,400 s = **578/s**");
    assertThat(section).contains("Peak throughput = 578/s x 10 = **5.8K/s**");
  }

  @Test
  void derivesStorageFromTheWriteShareAndRecordSize() {
    // 50M x 20% = 10M writes/day at 1,000 B each = 10^10 bytes, which is 9.3 GiB.
    String section = estimator.render(assumptions(10_000_000L, 5, 20, 1_000, 10, "searches"));

    assertThat(section).contains("Writes per day = 50M x 20% = **10M**");
    assertThat(section).contains("New data per day = 10M x 1000 B = **9.3 GB**");
    assertThat(section).contains("New data per year = 9.3 GB x 365 = **3.3 TB**");
    assertThat(section).contains("Five year footprint (before replication) = **16.6 TB**");
    assertThat(section).contains("With 3x replication = **49.8 TB**");
  }

  @Test
  void clampsImplausibleModelOutputSoTheTableCannotBeWildlyWrong() {
    // A negative record size or 100,000 actions per user would otherwise render an
    // authoritative-looking table full of nonsense, and a learner could not tell.
    String section = estimator.render(assumptions(5L, 100_000, 900, -20, 500, ""));

    assertThat(section).contains("| Daily active users | 10K |");
    assertThat(section).contains("| Requests per user per day | 500 |");
    assertThat(section).contains("| Share of actions that write | 100% |");
    assertThat(section).contains("| Average stored size per record | 32 B |");
    assertThat(section).contains("| Peak hour vs daily average | 20 x |");
  }

  @Test
  void namesTheActionUsingTheModelsOwnVocabulary() {
    String section = estimator.render(assumptions(1_000_000L, 10, 100, 1_000, 5, "messages"));

    assertThat(section).contains("| Messages per user per day |");
    assertThat(section).contains("Total messages per day = 1M users x 10 = **10M**");
  }

  private CapacityEstimator.Assumptions assumptions(
      long users, int actions, int writePercent, int bytes, int peak, String actionName) {
    return new CapacityEstimator.Assumptions(users, actions, writePercent, bytes, peak, actionName);
  }
}
