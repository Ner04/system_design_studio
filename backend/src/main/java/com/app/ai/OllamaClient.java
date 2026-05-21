package com.app.ai;

import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class OllamaClient {

  private final RestClient restClient;

  public OllamaClient(RestClient ollamaRestClient) {
    this.restClient = ollamaRestClient;
  }

  public String generate(String model, String prompt, boolean jsonMode) {
    Map<String, Object> request =
        jsonMode
            ? Map.of("model", model, "prompt", prompt, "stream", false, "format", "json")
            : Map.of("model", model, "prompt", prompt, "stream", false);

    OllamaGenerateResponse response =
        restClient.post().uri("/api/generate").body(request).retrieve().body(OllamaGenerateResponse.class);

    if (response == null || response.response() == null || response.response().isBlank()) {
      throw new IllegalStateException("Ollama returned an empty response");
    }

    return response.response();
  }

  private record OllamaGenerateResponse(String response) {}
}
