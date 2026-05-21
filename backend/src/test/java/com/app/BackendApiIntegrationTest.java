package com.app;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BackendApiIntegrationTest {

  @Autowired private MockMvc mockMvc;

  @Test
  void savesAndFetchesDiagram() throws Exception {
    MvcResult saveResult =
        mockMvc
            .perform(
                post("/api/diagram/save")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "title": "Uber Tracking",
                          "graph": {
                            "nodes": [{"id": "client", "type": "mobile", "data": {"label": "Client"}}],
                            "edges": []
                          }
                        }
                        """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id", notNullValue()))
            .andExpect(jsonPath("$.graph.nodes[0].id").value("client"))
            .andReturn();

    String id = JsonTestUtils.readJson(saveResult, "$.id");

    mockMvc
        .perform(get("/api/diagram/{id}", id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Uber Tracking"));
  }

  @Test
  void savesAndFetchesDocument() throws Exception {
    MvcResult saveResult =
        mockMvc
            .perform(
                post("/api/document/save")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "title": "Design Doc",
                          "markdown": "# Design Doc\\n\\n## APIs"
                        }
                        """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id", notNullValue()))
            .andExpect(jsonPath("$.markdown").value("# Design Doc\n\n## APIs"))
            .andReturn();

    String id = JsonTestUtils.readJson(saveResult, "$.id");

    mockMvc
        .perform(get("/api/document/{id}", id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Design Doc"));
  }

  @Test
  void exposesAiGenerationApiBoundary() throws Exception {
    mockMvc
        .perform(
            post("/api/ai/generate-diagram")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "prompt": "Design Uber realtime tracking",
                      "model": "llama3"
                    }
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("MOCK_AI"))
        .andExpect(jsonPath("$.model").value("llama3"))
        .andExpect(jsonPath("$.title").value("Uber Realtime Driver Tracking"))
        .andExpect(jsonPath("$.graph.nodes[0].id").value("mobile-client"))
        .andExpect(jsonPath("$.graph.edges[0].source").value("driver-app"))
        .andExpect(jsonPath("$.markdown").doesNotExist());

    mockMvc
        .perform(
            post("/api/ai/generate-document")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "prompt": "Design WhatsApp chat system",
                      "model": "mistral"
                    }
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("MOCK_AI"))
        .andExpect(jsonPath("$.title").value("WhatsApp Chat System"))
        .andExpect(jsonPath("$.markdown").isString())
        .andExpect(jsonPath("$.graph").doesNotExist());
  }
}
