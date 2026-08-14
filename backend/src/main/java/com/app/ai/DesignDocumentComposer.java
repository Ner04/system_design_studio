package com.app.ai;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Builds a full technical design document one section at a time.
 *
 * <p>A small local model spreads itself thin when asked for a long structured document in a
 * single pass: headings go missing, tables come back malformed, and later sections degrade into
 * repetition. Generating each section from its own narrow prompt keeps every request inside the
 * range these models handle well, and the parts that must be exact - the numbering, the table
 * headers, the release checklist - are written here rather than hoped for. A section that fails
 * or times out falls back to its own default, so one bad response never costs the whole document.
 */
@Component
public class DesignDocumentComposer {

  private final OllamaClient ollamaClient;
  private final GenerationProgressTracker progressTracker;

  public DesignDocumentComposer(
      OllamaClient ollamaClient, GenerationProgressTracker progressTracker) {
    this.ollamaClient = ollamaClient;
    this.progressTracker = progressTracker;
  }

  /** A section the model writes. The heading and numbering around it are fixed here. */
  private record ModelSection(String heading, String instruction, String fallback) {}

  public String compose(String systemName, String userPrompt, String model) {
    return compose(systemName, userPrompt, model, null);
  }

  public String compose(String systemName, String userPrompt, String model, String requestId) {
    List<ModelSection> sections = modelSections(systemName);
    // The three sections written here are effectively instant, so the reported total counts
    // only the model calls - the part the wait is actually made of.
    int totalSteps = sections.size();
    progressTracker.start(requestId, totalSteps, stepName(sections.getFirst()));
    StringBuilder document = new StringBuilder("# Technical Design Document: ")
        .append(systemName)
        .append("\n");

    boolean anySectionSucceeded = false;
    // Sections are generated independently, so without this the data model and API sections
    // invent service names that contradict the architecture section above them.
    String establishedComponents = "";
    for (ModelSection section : sections) {
      document.append("\n").append(section.heading()).append("\n\n");
      String body = generateSection(systemName, userPrompt, model, section, establishedComponents);
      anySectionSucceeded |= !body.equals(section.fallback());
      document.append(body.strip()).append("\n\n---\n");
      if (establishedComponents.isEmpty()) {
        establishedComponents = componentContext(body);
      }
    }

    // Ollama being unreachable would otherwise yield a document of nothing but fallbacks,
    // which reads as a real answer while containing no reasoning about the request at all.
    if (!anySectionSucceeded) {
      throw new IllegalStateException("Every document section fell back; Ollama produced nothing");
    }

    appendTestingStrategy(document, systemName);
    appendRolloutPlan(document, systemName);
    appendAppendix(document);
    return document.toString();
  }

  private String generateSection(
      String systemName,
      String userPrompt,
      String model,
      ModelSection section,
      String establishedComponents) {
    try {
      String prompt = sectionPrompt(systemName, userPrompt, section, establishedComponents);
      String cleaned = stripToBody(ollamaClient.generate(model, prompt, false));
      return cleaned.isBlank() ? section.fallback() : cleaned;
    } catch (RuntimeException exception) {
      return section.fallback();
    }
  }

  /** Pulls the "#### Service Name" headings out of the architecture section. */
  private String componentContext(String architectureBody) {
    List<String> components = new ArrayList<>();
    for (String line : architectureBody.split("\n")) {
      String trimmed = line.strip();
      if (trimmed.startsWith("#### ")) {
        components.add(trimmed.substring(5).strip());
      }
    }
    if (components.isEmpty()) {
      return "";
    }
    return "\n\nThe architecture section already defines these components: %s. Refer to them by these exact names and do not invent alternatives."
        .formatted(String.join(", ", components));
  }

  private String sectionPrompt(
      String systemName, String userPrompt, ModelSection section, String establishedComponents) {
    return """
        You are writing ONE section of a technical design document for "%s".
        The original request was: %s

        Write only the section described below. Do not write any other section.
        Do not repeat the section heading - it is already printed above your text.
        Do not add a preamble such as "Here is" or "Sure". Output the content only.
        Do not wrap your answer in code fences unless the content is source code or a schema.
        Use Markdown. Keep every statement specific to this system rather than generic advice.

        Write about the system itself. Never refer to "this section", "this document", or
        "this design" - the reader wants the architecture, not commentary about the writing.

        Name concrete technologies. Write "PostgreSQL", "Redis", or "Apache Kafka", never
        placeholder words like "Database", "Cache", or "Message Queue" on their own.

        The full document already covers, in later sections: the data model and database
        schema, the REST and realtime API, security and rate limiting, the testing strategy,
        the rollout plan, and monitoring. Never describe any of those as out of scope.%s

        %s
        """
        .formatted(systemName, userPrompt, establishedComponents, section.instruction());
  }

  /**
   * Models reliably re-emit the heading they were given and often open with a sentence of
   * acknowledgement, both of which would duplicate or corrupt the fixed structure.
   */
  private String stripToBody(String raw) {
    String body = raw.strip();
    if (body.startsWith("```")) {
      String withoutFence =
          body.replaceFirst("(?s)^```(?:markdown|md)?\\s*", "").replaceFirst("(?s)\\s*```$", "");
      // Only unwrap when the fence wrapped prose; a schema section legitimately starts with one.
      if (!withoutFence.contains("```")) {
        body = withoutFence.strip();
      }
    }

    List<String> kept = new ArrayList<>();
    boolean reachedContent = false;
    for (String line : body.split("\n", -1)) {
      String trimmed = line.strip();
      boolean isTopHeading = trimmed.startsWith("# ") || trimmed.startsWith("## ");
      boolean isPreamble =
          !reachedContent
              && trimmed.matches("(?i)^(sure|certainly|here('s| is| are)|below is|okay|ok)\\b.*");
      if (isTopHeading || isPreamble) {
        continue;
      }
      if (!trimmed.isBlank()) {
        reachedContent = true;
      }
      if (reachedContent) {
        kept.add(line);
      }
    }
    return String.join("\n", kept).strip();
  }

  private List<ModelSection> modelSections(String systemName) {
    return List.of(
        new ModelSection(
            "## 1. Overview",
            """
            Write exactly these two subsections, keeping the headings verbatim:

            ### 1.1 Background
            Two or three sentences on what this system does and why it is technically
            demanding. Name the specific pressure - traffic shape, consistency need,
            latency budget - rather than saying it is "complex" or "large scale".

            ### 1.2 Scope
            A bulleted list of 4 to 6 areas this design covers.
            """,
            """
            ### 1.1 Background

            This document describes the architecture for %s, covering the services, storage,
            and data flow needed to run it reliably.

            ### 1.2 Scope

            - Core request handling and service boundaries
            - Data storage and access patterns
            - Asynchronous and background processing
            - Scaling and failure behaviour
            """
                .formatted(systemName)),
        new ModelSection(
            "## 2. Goals and Non-Goals",
            """
            Write exactly these two subsections, keeping the headings verbatim:

            ### 2.1 Goals
            Exactly 5 bullets. Each starts with a bolded short name, then a colon, then a
            measurable target with a real number and a percentile or unit. Name goals drawn
            from THIS system's own workload rather than reusing any example wording.
            Give real numbers, never "fast", "robust", or "scalable".

            ### 2.2 Non-Goals
            4 to 6 bullets naming things this design deliberately does NOT cover, such as
            adjacent systems owned by other teams. Be concrete about the boundary.
            """,
            """
            ### 2.1 Goals

            - **Latency**: serve core read requests in under 300ms at p99
            - **Availability**: 99.9% uptime for the primary request path
            - **Scalability**: scale horizontally with stateless services
            - **Durability**: no acknowledged write is lost

            ### 2.2 Non-Goals

            - Billing and payment processing
            - User onboarding and identity verification
            - Internal analytics and reporting interfaces
            - Customer support tooling
            """),
        new ModelSection(
            "## 3. Architecture",
            """
            Write exactly these two subsections, keeping the headings verbatim:

            ### 3.1 High-Level Architecture
            One sentence naming the architectural style, then a Markdown table with exactly
            these columns: Layer | Components | Responsibility. Give 5 or 6 rows covering
            clients, gateway/edge, core services, messaging, and storage. Name real
            technologies in the Components column.

            ### 3.2 Component Details
            For each core service, a "#### " heading with the service name, then 3 or 4
            bullets covering what it owns, what it talks to, and how it scales.
            """,
            """
            ### 3.1 High-Level Architecture

            The system uses an event-driven service architecture.

            | Layer | Components | Responsibility |
            | --- | --- | --- |
            | Clients | Web and mobile apps | User-facing interaction |
            | Edge | Load balancer, API gateway | Routing, TLS, rate limiting |
            | Core Services | Application services | Business logic |
            | Messaging | Event queue | Decoupling and async work |
            | Storage | Primary database, cache | Durable state and hot reads |

            ### 3.2 Component Details

            #### API Gateway
            - Terminates TLS and authenticates every request
            - Applies per-client rate limits before traffic reaches core services

            #### Core Service
            - Owns the primary domain workflows and validation
            - Reads and writes the primary database, caching hot lookups
            """),
        new ModelSection(
            "## 4. Data Model",
            """
            Write exactly these three subsections, keeping the headings verbatim:

            ### 4.1 Core Entity
            A json code block showing the main record this system stores, with realistic
            field names and example values. Include an enum-style status field.

            ### 4.2 Event Payload
            A json code block for the main event this system publishes or ingests.

            ### 4.3 Schema
            A sql code block with CREATE TABLE statements for the main tables, including
            primary keys and the indexes the access patterns need.
            """,
            """
            ### 4.1 Core Entity

            ```json
            {
              "id": "uuid",
              "status": "PENDING | ACTIVE | COMPLETED",
              "created_at": "ISO-8601",
              "updated_at": "ISO-8601"
            }
            ```

            ### 4.2 Event Payload

            ```json
            {
              "event_id": "uuid",
              "entity_id": "uuid",
              "type": "CREATED | UPDATED",
              "occurred_at": "ISO-8601"
            }
            ```

            ### 4.3 Schema

            ```sql
            CREATE TABLE entities (
                id UUID PRIMARY KEY,
                status TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL
            );

            CREATE INDEX idx_entities_status_created ON entities (status, created_at DESC);
            ```
            """),
        new ModelSection(
            "## 5. API Design",
            """
            Write exactly these two subsections, keeping the headings verbatim:

            ### 5.1 REST Endpoints
            Exactly three endpoints: one that creates something, one that fetches a single
            record by id, and one supporting operation. Name each "#### " heading after what
            the endpoint does, for example "#### Create Booking" or "#### Get Booking Status".
            Never prefix a heading with the words "Write" or "Read".

            Under each heading put ONE fenced code block laid out exactly like this, with no
            bullet lists and no bold labels around it:

            ```
            POST /api/v1/bookings
            Authorization: Bearer <token>

            Request:
            { "field": "value" }

            Response: 201 Created
            { "id": "uuid", "status": "PENDING" }
            ```

            Copy the LAYOUT of that block only. The paths, headings, and field names must use
            this system's own vocabulary, never the words "booking" or "field" from the example.

            ### 5.2 Realtime Events
            A Markdown table with columns Event | Payload | Description, listing 4 events
            the server pushes to clients. Skip this subsection's table and write one
            sentence instead if this system genuinely has no realtime component.
            """,
            """
            ### 5.1 REST Endpoints

            #### Create Resource

            ```
            POST /api/v1/resources
            Authorization: Bearer <token>

            Request:
            { "name": "string" }

            Response: 201 Created
            { "id": "uuid", "status": "PENDING" }
            ```

            #### Get Resource

            ```
            GET /api/v1/resources/{id}
            Authorization: Bearer <token>

            Response: 200 OK
            { "id": "uuid", "status": "ACTIVE" }
            ```

            ### 5.2 Realtime Events

            | Event | Payload | Description |
            | --- | --- | --- |
            | `resource:created` | `{ id }` | A new resource was created |
            | `resource:updated` | `{ id, status }` | Resource state changed |
            """),
        new ModelSection(
            "## 6. Security Considerations",
            """
            Write exactly these four subsections, keeping the headings verbatim:

            ### 6.1 Authentication and Authorization
            3 or 4 bullets naming the mechanisms and the roles in this system.

            ### 6.2 Data Protection
            3 or 4 bullets on transport security, encryption at rest, and handling of any
            personal data this specific system holds.

            ### 6.3 Rate Limiting
            A Markdown table with columns Endpoint Type | Limit, giving 3 or 4 concrete
            limits for this system's actual endpoints.

            ### 6.4 Threat Mitigation
            3 or 4 bullets on abuse specific to this domain and how the design counters it.
            """,
            """
            ### 6.1 Authentication and Authorization

            - JWT bearer tokens on every authenticated request
            - Role-based access control separating regular and administrative users
            - Short token lifetimes with refresh tokens

            ### 6.2 Data Protection

            - TLS for all client and service-to-service traffic
            - Encryption at rest for the primary database and backups
            - Personal data minimised and access audited

            ### 6.3 Rate Limiting

            | Endpoint Type | Limit |
            | --- | --- |
            | Write endpoints | 10 req/min per user |
            | Read endpoints | 100 req/min per user |
            | Authentication | 5 attempts/min per IP |

            ### 6.4 Threat Mitigation

            - Input validation and schema enforcement on every public endpoint
            - Rate limits and anomaly detection on authentication paths
            - Audit logging for administrative actions
            """));
  }

  private void appendTestingStrategy(StringBuilder document, String systemName) {
    document.append("""

        ## 7. Testing Strategy

        ### 7.1 Unit Testing

        - Service logic covered with dependencies mocked
        - Target: 80% line coverage on core services
        - Frameworks: JUnit 5 and Mockito

        ### 7.2 Integration Testing

        - Database read and write paths against a real engine, not an in-memory stand-in
        - Message producer and consumer contracts
        - Cache invalidation behaviour under concurrent writes
        - Authentication and authorization on every public endpoint

        ### 7.3 Load Testing

        | Scenario | Target |
        | --- | --- |
        | Sustained write throughput | 10k requests/sec |
        | Read latency (p99) | < 300 ms |
        | Concurrent connections | 100k |
        | Error rate under peak load | < 0.1% |

        ### 7.4 Chaos Engineering

        - Primary database failover during sustained write load
        - Cache cluster node loss and cold-start behaviour
        - Network partition between core services
        - Message broker unavailability and consumer backlog recovery

        ---
        """);
  }

  private void appendRolloutPlan(StringBuilder document, String systemName) {
    document.append("""

        ## 8. Rollout Plan

        ### 8.1 Phase 1: Infrastructure (Week 1-2)

        - [ ] Provision database cluster with replication and automated backups
        - [ ] Deploy cache cluster
        - [ ] Stand up the message broker and create topics with retention policies
        - [ ] Configure load balancers, TLS certificates, and DNS

        ### 8.2 Phase 2: Core Services (Week 3-4)

        - [ ] Deploy core services to staging
        - [ ] Wire up metrics, logging, and distributed tracing
        - [ ] Run integration and load test suites against staging
        - [ ] Complete security review and dependency audit

        ### 8.3 Phase 3: Shadow Mode (Week 5)

        - [ ] Mirror production traffic to the new system without serving its responses
        - [ ] Compare outputs against the existing system and investigate divergence
        - [ ] Tune capacity, connection pools, and consumer parallelism

        ### 8.4 Phase 4: Canary Release (Week 6)

        - [ ] Route 5% of traffic to the new system
        - [ ] Watch latency, error rate, and saturation against agreed thresholds
        - [ ] Increase gradually: 5% -> 25% -> 50% -> 100%
        - [ ] Keep a tested rollback path at every step

        ### 8.5 Phase 5: Full Production (Week 7-8)

        - [ ] Complete traffic migration
        - [ ] Decommission superseded components
        - [ ] Publish runbooks and on-call documentation

        ---
        """);
  }

  private void appendAppendix(StringBuilder document) {
    document.append("""

        ## 9. Appendix

        ### 9.1 Monitoring and Alerting

        | Metric | Alert Threshold |
        | --- | --- |
        | Request latency (p99) | > 500 ms for 5 minutes |
        | Error rate | > 1% of requests |
        | Message consumer lag | > 10,000 messages |
        | Database replication lag | > 10 seconds |
        | Cache hit rate | < 80% |

        ### 9.2 Dependencies

        """);
    document.append(dependencyTable(document.toString())).append("\n");
  }

  /**
   * The dependency table is derived from the technologies the generated sections actually
   * mention, so it stays accurate for this system instead of listing a fixed stack.
   */
  private String dependencyTable(String documentSoFar) {
    String haystack = documentSoFar.toLowerCase(Locale.ROOT);
    Map<String, String[]> catalogue = technologyCatalogue();

    StringBuilder table = new StringBuilder("| Service | Version | Purpose |\n| --- | --- | --- |\n");
    int matches = 0;
    for (Map.Entry<String, String[]> entry : catalogue.entrySet()) {
      if (haystack.contains(entry.getKey())) {
        String[] row = entry.getValue();
        table.append("| %s | %s | %s |\n".formatted(row[0], row[1], row[2]));
        matches++;
      }
    }
    if (matches == 0) {
      table.append("| PostgreSQL | 16+ | Primary relational storage |\n");
      table.append("| Redis | 7.0+ | Caching layer |\n");
    }
    return table.toString();
  }

  private Map<String, String[]> technologyCatalogue() {
    Map<String, String[]> catalogue = new LinkedHashMap<>();
    catalogue.put("kafka", new String[] {"Apache Kafka", "3.5+", "Event streaming"});
    catalogue.put("rabbitmq", new String[] {"RabbitMQ", "3.12+", "Message queuing"});
    catalogue.put("redis", new String[] {"Redis", "7.0+", "Caching and hot lookups"});
    catalogue.put("cassandra", new String[] {"Apache Cassandra", "4.1+", "Write-heavy storage"});
    catalogue.put("postgres", new String[] {"PostgreSQL", "16+", "Relational storage"});
    catalogue.put("mysql", new String[] {"MySQL", "8.0+", "Relational storage"});
    catalogue.put("mongodb", new String[] {"MongoDB", "7.0+", "Document storage"});
    catalogue.put("dynamodb", new String[] {"Amazon DynamoDB", "-", "Key-value storage"});
    catalogue.put("elasticsearch", new String[] {"Elasticsearch", "8.x", "Search indexing"});
    catalogue.put("opensearch", new String[] {"OpenSearch", "2.x", "Search indexing"});
    catalogue.put("flink", new String[] {"Apache Flink", "1.17+", "Stream processing"});
    catalogue.put("spark", new String[] {"Apache Spark", "3.5+", "Batch processing"});
    catalogue.put("kubernetes", new String[] {"Kubernetes", "1.28+", "Container orchestration"});
    catalogue.put("nginx", new String[] {"NGINX", "1.25+", "Load balancing"});
    catalogue.put("amazon s3", new String[] {"Amazon S3", "-", "Object storage"});
    return catalogue;
  }
}
