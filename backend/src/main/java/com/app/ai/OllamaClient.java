package com.app.ai;

import java.util.Map;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClient;

@Component
public class OllamaClient {

  private final RestClient restClient;

  public OllamaClient(RestClient ollamaRestClient) {
    this.restClient = ollamaRestClient;
  }

  public String generate(String model, String prompt, boolean jsonMode) {
    String resolvedModel = resolveModel(model);
    if (resolvedModel == null || resolvedModel.isBlank()) {
      throw new OllamaUnavailableException(
          "Ollama is running, but no local models are installed. Run `ollama pull llama3.2` or select an installed model.");
    }

    Map<String, Object> request =
        jsonMode
            ? Map.of("model", resolvedModel, "prompt", prompt, "stream", false, "format", "json")
            : Map.of("model", resolvedModel, "prompt", prompt, "stream", false);

    OllamaGenerateResponse response;
    try {
      response =
          restClient
              .post()
              .uri("/api/generate")
              .body(request)
              .retrieve()
              .body(OllamaGenerateResponse.class);
    } catch (RestClientResponseException exception) {
      String responseBody = exception.getResponseBodyAsString();
      if (exception.getStatusCode().value() == 404 && responseBody.contains("model")) {
        throw new OllamaUnavailableException(
            "Ollama model `%s` is not installed. Run `ollama pull %s` or choose an installed model."
                .formatted(resolvedModel, resolvedModel),
            exception);
      }
      throw exception;
    }

    if (response == null || response.response() == null || response.response().isBlank()) {
      throw new IllegalStateException("Ollama returned an empty response");
    }

    return response.response();
  }

  String resolveModel(String requestedModel) {
    String requested = requestedModel == null ? "" : requestedModel.trim();
    if (requested.isBlank()) {
      return requestedModel;
    }

    List<String> localModels = localModelNames();
    if (localModels.isEmpty()) {
      return "";
    }

    for (String localModel : localModels) {
      if (localModel.equalsIgnoreCase(requested)) {
        return localModel;
      }
    }

    String[] preferredPrefixes = preferredPrefixesFor(requested);
    for (String preferredPrefix : preferredPrefixes) {
      for (String localModel : localModels) {
        if (normalized(localModel).startsWith(normalized(preferredPrefix))) {
          return localModel;
        }
      }
    }

    for (String localModel : localModels) {
      if (normalized(localModel).startsWith(normalized(requested))) {
        return localModel;
      }
    }

    return localModels.getFirst();
  }

  private List<String> localModelNames() {
    try {
      OllamaTagsResponse response =
          restClient.get().uri("/api/tags").retrieve().body(OllamaTagsResponse.class);
      if (response == null || response.models() == null) {
        return List.of();
      }
      return response.models().stream()
          .map(model -> model.name() == null || model.name().isBlank() ? model.model() : model.name())
          .filter(name -> name != null && !name.isBlank())
          .toList();
    } catch (RuntimeException exception) {
      return List.of();
    }
  }

  private String[] preferredPrefixesFor(String requestedModel) {
    return switch (requestedModel.toLowerCase(Locale.ROOT)) {
      case "deepseek" -> new String[] {"deepseek-r1", "deepseek"};
      case "qwen" -> new String[] {"qwen3", "qwen2.5", "qwen2", "qwen"};
      case "llama3" -> new String[] {"llama3.3", "llama3.2", "llama3.1", "llama3"};
      default -> new String[] {requestedModel};
    };
  }

  private String normalized(String value) {
    return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
  }

  private record OllamaGenerateResponse(String response) {}

  private record OllamaTagsResponse(List<OllamaModel> models) {}

  private record OllamaModel(String name, String model) {}
}
