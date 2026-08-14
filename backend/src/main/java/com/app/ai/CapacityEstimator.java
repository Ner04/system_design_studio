package com.app.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Produces the back-of-envelope capacity section.
 *
 * <p>Small local models cannot be trusted with chained unit arithmetic - earlier versions of this
 * section divided per-day quantities by per-second ones and contradicted their own assumptions two
 * lines later. So the model is asked only for the things that genuinely require judgement about
 * the domain, namely the starting assumptions, and every number derived from them is computed
 * here. A reader preparing for an interview needs the working to be right, because they are not
 * yet in a position to notice when it is not.
 */
@Component
public class CapacityEstimator {

  private static final long SECONDS_PER_DAY = 86_400L;

  private final OllamaClient ollamaClient;
  private final ObjectMapper objectMapper;

  public CapacityEstimator(OllamaClient ollamaClient, ObjectMapper objectMapper) {
    this.ollamaClient = ollamaClient;
    this.objectMapper = objectMapper;
  }

  /** The judgement calls, all of which a model can reasonably make and a human can sanity-check. */
  record Assumptions(
      long dailyActiveUsers,
      int actionsPerUserPerDay,
      int writePercent,
      int bytesPerRecord,
      int peakMultiplier,
      String actionName) {

    /**
     * A model that returns a nonsense magnitude would otherwise produce a table that looks
     * authoritative and is off by orders of magnitude, so every field is clamped to a range that
     * is at least arguable for a real consumer system.
     */
    Assumptions {
      dailyActiveUsers = clamp(dailyActiveUsers, 10_000L, 3_000_000_000L);
      actionsPerUserPerDay = (int) clamp(actionsPerUserPerDay, 1, 500);
      writePercent = (int) clamp(writePercent, 1, 100);
      bytesPerRecord = (int) clamp(bytesPerRecord, 32, 10_000_000);
      peakMultiplier = (int) clamp(peakMultiplier, 2, 20);
      actionName = actionName == null || actionName.isBlank() ? "requests" : actionName.trim();
    }

    private static long clamp(long value, long min, long max) {
      return Math.max(min, Math.min(max, value));
    }
  }

  public String estimateFor(String systemName, String userPrompt, String model) {
    Assumptions assumptions = askForAssumptions(systemName, userPrompt, model);
    return render(assumptions);
  }

  private Assumptions askForAssumptions(String systemName, String userPrompt, String model) {
    try {
      String raw = ollamaClient.generateStructured(model, assumptionsPrompt(systemName, userPrompt), schema());
      JsonNode node = objectMapper.readTree(raw);
      return new Assumptions(
          node.path("dailyActiveUsers").asLong(10_000_000L),
          node.path("actionsPerUserPerDay").asInt(10),
          node.path("writePercent").asInt(20),
          node.path("bytesPerRecord").asInt(1_000),
          node.path("peakMultiplier").asInt(5),
          node.path("actionName").asText("requests"));
    } catch (Exception exception) {
      // Defaults describe a mid-sized consumer service, which is a defensible starting point
      // and keeps the section honest about being an assumption rather than a measurement.
      return new Assumptions(10_000_000L, 10, 20, 1_000, 5, "requests");
    }
  }

  private String assumptionsPrompt(String systemName, String userPrompt) {
    return """
        Estimate the scale of "%s". The original request was: %s

        Return only the starting assumptions for a back-of-envelope capacity estimate.
        Do not calculate anything - the arithmetic is done elsewhere.

        - dailyActiveUsers: realistic daily active users for a system of this kind
        - actionName: the plural name of the MOST COMMON interaction, which is nearly always
          a read - "searches", "seat lookups", "feed views", "page views". Not the rare
          valuable action.
        - actionsPerUserPerDay: how many of those interactions one user performs per day
        - writePercent: what share of those interactions create or modify stored data. This is
          small when the common interaction is browsing, and large when almost every
          interaction writes. It must be consistent with actionName.
        - bytesPerRecord: average stored size of one written record, in bytes
        - peakMultiplier: how much busier the peak hour is than the daily average. Systems
          where demand arrives all at once - ticket sales, flash sales, live events - are far
          spikier than steady consumer traffic.
        """
        .formatted(systemName, userPrompt);
  }

  private Map<String, Object> schema() {
    return Map.of(
        "type", "object",
        "properties", Map.of(
            "dailyActiveUsers", Map.of("type", "integer"),
            "actionsPerUserPerDay", Map.of("type", "integer"),
            "writePercent", Map.of("type", "integer"),
            "bytesPerRecord", Map.of("type", "integer"),
            "peakMultiplier", Map.of("type", "integer"),
            "actionName", Map.of("type", "string")),
        "required",
            List.of(
                "dailyActiveUsers",
                "actionsPerUserPerDay",
                "writePercent",
                "bytesPerRecord",
                "peakMultiplier",
                "actionName"));
  }

  /**
   * Shows the working rather than only the totals: on a whiteboard the interviewer is watching
   * the derivation, so the document models the derivation.
   */
  String render(Assumptions a) {
    long actionsPerDay = a.dailyActiveUsers() * a.actionsPerUserPerDay();
    long averagePerSecond = actionsPerDay / SECONDS_PER_DAY;
    long peakPerSecond = averagePerSecond * a.peakMultiplier();
    long writesPerDay = actionsPerDay * a.writePercent() / 100;
    long bytesPerDay = writesPerDay * a.bytesPerRecord();
    long bytesPerYear = bytesPerDay * 365;
    long readBytesPerSecond = averagePerSecond * a.bytesPerRecord();

    return """
        Every figure below follows from the assumptions in the first block. Nothing here is a
        measurement - the point is the method, and the ability to redo it on a whiteboard.

        ### Assumptions

        | Assumption | Value |
        | --- | ---: |
        | Daily active users | %s |
        | %s per user per day | %s |
        | Share of actions that write | %d%% |
        | Average stored size per record | %s |
        | Peak hour vs daily average | %d x |

        ### Traffic

        - Total %s per day = %s users x %s = **%s**
        - Average throughput = %s / 86,400 s = **%s/s**
        - Peak throughput = %s/s x %d = **%s/s**

        ### Storage

        - Writes per day = %s x %d%% = **%s**
        - New data per day = %s x %s = **%s**
        - New data per year = %s x 365 = **%s**
        - Five year footprint (before replication) = **%s**
        - With 3x replication = **%s**

        ### Bandwidth

        - Read egress at average load = %s/s x %s = **%s/s**

        The peak figure is the one that sizes the system. Designing for the average leaves no
        headroom for the busiest hour of the day.
        """
        .formatted(
            count(a.dailyActiveUsers()),
            capitalise(a.actionName()),
            count(a.actionsPerUserPerDay()),
            a.writePercent(),
            bytes(a.bytesPerRecord()),
            a.peakMultiplier(),
            a.actionName(),
            count(a.dailyActiveUsers()),
            count(a.actionsPerUserPerDay()),
            count(actionsPerDay),
            count(actionsPerDay),
            count(averagePerSecond),
            count(averagePerSecond),
            a.peakMultiplier(),
            count(peakPerSecond),
            count(actionsPerDay),
            a.writePercent(),
            count(writesPerDay),
            count(writesPerDay),
            bytes(a.bytesPerRecord()),
            bytes(bytesPerDay),
            bytes(bytesPerDay),
            bytes(bytesPerYear),
            bytes(bytesPerYear * 5),
            bytes(bytesPerYear * 15),
            count(averagePerSecond),
            bytes(a.bytesPerRecord()),
            bytes(readBytesPerSecond));
  }

  private String capitalise(String value) {
    return value.isBlank() ? value : Character.toUpperCase(value.charAt(0)) + value.substring(1);
  }

  private String count(long value) {
    if (value >= 1_000_000_000L) return trim(value / 1_000_000_000d) + "B";
    if (value >= 1_000_000L) return trim(value / 1_000_000d) + "M";
    if (value >= 1_000L) return trim(value / 1_000d) + "K";
    return Long.toString(value);
  }

  private String bytes(long value) {
    if (value >= 1L << 50) return trim(value / (double) (1L << 50)) + " PB";
    if (value >= 1L << 40) return trim(value / (double) (1L << 40)) + " TB";
    if (value >= 1L << 30) return trim(value / (double) (1L << 30)) + " GB";
    if (value >= 1L << 20) return trim(value / (double) (1L << 20)) + " MB";
    if (value >= 1L << 10) return trim(value / (double) (1L << 10)) + " KB";
    return value + " B";
  }

  private String trim(double value) {
    return value >= 100 || value == Math.floor(value)
        ? String.valueOf(Math.round(value))
        : String.format("%.1f", value);
  }
}
