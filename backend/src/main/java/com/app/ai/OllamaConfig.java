package com.app.ai;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(OllamaProperties.class)
public class OllamaConfig {

  @Bean
  RestClient ollamaRestClient(OllamaProperties properties) {
    SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
    requestFactory.setConnectTimeout(3_000);
    requestFactory.setReadTimeout(properties.readTimeoutSeconds() * 1_000);

    return RestClient.builder()
        .requestFactory(requestFactory)
        .baseUrl(properties.baseUrl())
        .build();
  }
}
