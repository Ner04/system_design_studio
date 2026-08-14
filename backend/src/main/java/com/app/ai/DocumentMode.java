package com.app.ai;

import java.util.Locale;

/**
 * What the document is for, which decides which sections it contains.
 *
 * <p>The two audiences want almost opposite things. Someone preparing for a system design
 * interview is scored on requirements, estimation, a deep dive and defended tradeoffs, and is
 * never asked about test coverage or a release checklist. A team about to build the thing needs
 * exactly those operational sections. Producing both by default served neither well.
 */
public enum DocumentMode {
  /** Shaped like a system design interview: requirements, estimation, deep dive, tradeoffs. */
  INTERVIEW,
  /** Adds the operational sections a team needs before shipping. */
  DELIVERY;

  public static DocumentMode from(String value) {
    if (value == null || value.isBlank()) {
      return INTERVIEW;
    }
    try {
      return valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      return INTERVIEW;
    }
  }
}
