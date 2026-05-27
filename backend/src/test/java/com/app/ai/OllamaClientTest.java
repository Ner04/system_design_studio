package com.app.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class OllamaClientTest {

  @Test
  void resolvesDeepseekAliasToInstalledOllamaTag() {
    RestClient.Builder builder = RestClient.builder().baseUrl("http://ollama.test");
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    OllamaClient client = new OllamaClient(builder.build());

    server
        .expect(once(), requestTo("http://ollama.test/api/tags"))
        .andExpect(method(HttpMethod.GET))
        .andRespond(
            withSuccess(
                """
                {
                  "models": [
                    {"name": "llama3.2:latest"},
                    {"name": "deepseek-r1:7b"}
                  ]
                }
                """,
                MediaType.APPLICATION_JSON));
    server
        .expect(once(), requestTo("http://ollama.test/api/generate"))
        .andExpect(method(HttpMethod.POST))
        .andExpect(
            content()
                .json(
                    """
                    {
                      "model": "deepseek-r1:7b",
                      "prompt": "hello",
                      "stream": false
                    }
                    """))
        .andRespond(withSuccess("{\"response\":\"done\"}", MediaType.APPLICATION_JSON));

    assertThat(client.generate("deepseek", "hello", false)).isEqualTo("done");
    server.verify();
  }

  @Test
  void failsFastWhenOllamaHasNoInstalledModels() {
    RestClient.Builder builder = RestClient.builder().baseUrl("http://ollama.test");
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    OllamaClient client = new OllamaClient(builder.build());

    server
        .expect(once(), requestTo("http://ollama.test/api/tags"))
        .andExpect(method(HttpMethod.GET))
        .andRespond(withSuccess("{\"models\":[]}", MediaType.APPLICATION_JSON));

    assertThatThrownBy(() -> client.generate("llama3", "hello", false))
        .isInstanceOf(OllamaUnavailableException.class)
        .hasMessageContaining("no local models are installed");
    server.verify();
  }

  @Test
  void reportsMissingModelFromOllamaGenerate404() {
    RestClient.Builder builder = RestClient.builder().baseUrl("http://ollama.test");
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    OllamaClient client = new OllamaClient(builder.build());

    server
        .expect(once(), requestTo("http://ollama.test/api/tags"))
        .andExpect(method(HttpMethod.GET))
        .andRespond(
            withSuccess(
                """
                {"models":[{"name":"llama3:latest"}]}
                """,
                MediaType.APPLICATION_JSON));
    server
        .expect(once(), requestTo("http://ollama.test/api/generate"))
        .andExpect(method(HttpMethod.POST))
        .andRespond(
            withStatus(HttpStatus.NOT_FOUND)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\":\"model 'llama3:latest' not found\"}"));

    assertThatThrownBy(() -> client.generate("llama3", "hello", false))
        .isInstanceOf(OllamaUnavailableException.class)
        .hasMessageContaining("llama3:latest");
    server.verify();
  }
}
