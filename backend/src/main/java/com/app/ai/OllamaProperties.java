package com.app.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.ai.ollama")
public record OllamaProperties(
    boolean enabled, String baseUrl, String defaultModel, int retries, int readTimeoutSeconds) {

  public OllamaProperties {
    if (baseUrl == null || baseUrl.isBlank()) {
      baseUrl = "http://localhost:11434";
    }
    if (defaultModel == null || defaultModel.isBlank()) {
      defaultModel = "llama3";
    }
    if (retries < 1) {
      retries = 1;
    }
    // A long document on a small local model can run for minutes on modest hardware,
    // and a read timeout there costs a whole generation.
    if (readTimeoutSeconds < 1) {
      readTimeoutSeconds = 300;
    }
  }
}
