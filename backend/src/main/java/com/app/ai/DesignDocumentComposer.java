package com.app.ai;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Builds a technical design document one section at a time.
 *
 * <p>A small local model spreads itself thin when asked for a long structured document in a single
 * pass: headings go missing, tables come back malformed, and later sections degrade into
 * repetition. Generating each section from its own narrow prompt keeps every request inside the
 * range these models handle well, and the parts that must be exact - the numbering, the table
 * headers, the arithmetic, the release checklist - are computed here rather than hoped for. A
 * section that fails or times out falls back to its own default, so one bad response never costs
 * the whole document.
 */
@Component
public class DesignDocumentComposer {

  private final OllamaClient ollamaClient;
  private final GenerationProgressTracker progressTracker;
  private final CapacityEstimator capacityEstimator;

  public DesignDocumentComposer(
      OllamaClient ollamaClient,
      GenerationProgressTracker progressTracker,
      CapacityEstimator capacityEstimator) {
    this.ollamaClient = ollamaClient;
    this.progressTracker = progressTracker;
    this.capacityEstimator = capacityEstimator;
  }

  private enum Kind {
    /** Written by the model from the section's own instruction. */
    MODEL,
    /** Assumptions come from the model, every derived number is computed in Java. */
    CAPACITY,
    /** Written entirely here; a checklist needs no model. */
    FIXED
  }

  /**
   * Section numbers are assigned at assembly time rather than baked into the title, because the
   * section list depends on the mode.
   */
  private record DocSection(String title, Kind kind, String instruction, String fallback) {}

  public String compose(String systemName, String userPrompt, String model) {
    return compose(systemName, userPrompt, model, null, DocumentMode.INTERVIEW);
  }

  public String compose(
      String systemName, String userPrompt, String model, String requestId, DocumentMode mode) {
    List<DocSection> sections = sectionsFor(mode);
    // Only sections that call the model contribute to the wait, so only those are counted.
    int totalSteps = (int) sections.stream().filter(section -> section.kind() != Kind.FIXED).count();
    progressTracker.start(requestId, totalSteps, sections.getFirst().title());
    // A failed generation must not leave the client polling a step that will never advance.
    try {
      return assemble(systemName, userPrompt, model, requestId, sections, totalSteps);
    } finally {
      progressTracker.finish(requestId);
    }
  }

  private String assemble(
      String systemName,
      String userPrompt,
      String model,
      String requestId,
      List<DocSection> sections,
      int totalSteps) {
    StringBuilder document =
        new StringBuilder("# Technical Design Document: ").append(systemName).append("\n");

    boolean anySectionSucceeded = false;
    int completedSteps = 0;
    // Sections are generated independently, so without this the data model and API sections
    // invent service names that contradict the architecture section above them.
    String establishedComponents = "";

    for (int index = 0; index < sections.size(); index++) {
      DocSection section = sections.get(index);
      document.append("\n## ").append(index + 1).append(". ").append(section.title()).append("\n\n");

      String body;
      if (section.kind() == Kind.FIXED) {
        body = section.fallback();
      } else {
        progressTracker.update(requestId, completedSteps, totalSteps, section.title());
        completedSteps++;
        body = generateSection(systemName, userPrompt, model, section, establishedComponents);
        // Only prose sections count as evidence the model is alive. The capacity section
        // renders a usable table from default assumptions even when every call failed, so
        // letting it vote here would mask a completely dead Ollama.
        if (section.kind() == Kind.MODEL) {
          anySectionSucceeded |= !body.equals(section.fallback());
        }
      }

      document.append(body.strip()).append("\n\n---\n");
      // Publishing the document so far lets the browser render each section as it lands,
      // which turns a multi-minute blank wait into visible progress.
      progressTracker.update(
          requestId, completedSteps, totalSteps, section.title(), document.toString());
      if (establishedComponents.isEmpty() && section.kind() == Kind.MODEL) {
        establishedComponents = componentContext(body);
      }
    }
    progressTracker.update(requestId, totalSteps, totalSteps, "Assembling document");

    // Ollama being unreachable would otherwise yield a document of nothing but fallbacks,
    // which reads as a real answer while containing no reasoning about the request at all.
    if (!anySectionSucceeded) {
      throw new IllegalStateException("Every document section fell back; Ollama produced nothing");
    }

    if (document.indexOf("### Dependencies") >= 0) {
      replaceDependencyPlaceholder(document);
    }
    return document.toString();
  }

  private String generateSection(
      String systemName,
      String userPrompt,
      String model,
      DocSection section,
      String establishedComponents) {
    try {
      if (section.kind() == Kind.CAPACITY) {
        return capacityEstimator.estimateFor(systemName, userPrompt, model);
      }
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
      String systemName, String userPrompt, DocSection section, String establishedComponents) {
    return """
        You are writing ONE section of a system design document for "%s".
        The original request was: %s

        Write only the section described below. Do not write any other section.
        Do not repeat the section heading - it is already printed above your text.
        Do not add a preamble such as "Here is" or "Sure". Output the content only.
        Do not wrap your answer in code fences unless the content is source code or a schema.
        Use Markdown, and use "### " for any subheading you need.

        Write about the system itself. Never refer to "this section", "this document", or
        "this design" - the reader wants the architecture, not commentary about the writing.

        Name concrete technologies. Write "PostgreSQL", "Redis", or "Apache Kafka", never
        placeholder words like "Database", "Cache", or "Message Queue" on their own.

        The architecture here is a horizontally scaled, distributed, multi-service system.
        Never claim it runs on a single machine.%s

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

  private List<DocSection> sectionsFor(DocumentMode mode) {
    List<DocSection> sections = new ArrayList<>(interviewSections());
    if (mode == DocumentMode.DELIVERY) {
      sections.addAll(deliverySections());
    }
    return sections;
  }

  private List<DocSection> interviewSections() {
    return List.of(
        new DocSection(
            "Problem and Requirements",
            Kind.MODEL,
            """
            Write exactly these three subsections, keeping the headings verbatim:

            ### Functional Requirements
            5 or 6 bullets. Each is one capability, stated as something a user can do.

            ### Non-Functional Requirements
            4 or 5 bullets, each carrying a number: a latency target with a percentile, an
            availability target, a consistency requirement, a durability requirement.

            ### Out of Scope
            3 or 4 bullets naming what you are deliberately not designing. Scoping the problem
            on purpose is the first thing an interviewer looks for.
            """,
            """
            ### Functional Requirements

            - Users can create, read, and manage the core records of the system.
            - Users can search and filter those records.
            - The system notifies users when relevant state changes.
            - Administrators can audit activity.

            ### Non-Functional Requirements

            - Read latency under 300 ms at p99.
            - Availability of 99.9% for the primary request path.
            - Read-your-writes consistency for a user's own data.
            - No acknowledged write is ever lost.

            ### Out of Scope

            - Billing and payment processing.
            - Identity verification and onboarding.
            - Internal analytics interfaces.
            """),
        new DocSection("Capacity Estimation", Kind.CAPACITY, "", capacityFallback()),
        new DocSection(
            "High-Level Architecture",
            Kind.MODEL,
            """
            One sentence naming the architectural style, then a Markdown table with exactly
            these columns: Layer | Components | Responsibility. Give 5 or 6 rows covering
            clients, edge, core services, messaging, and storage, naming real technologies.

            Then a "### Component Details" subheading, and under it a "#### " heading per core
            service with 3 bullets each: what it owns, what it talks to, and how it scales.
            """,
            """
            The system uses an event-driven service architecture.

            | Layer | Components | Responsibility |
            | --- | --- | --- |
            | Clients | Web and mobile apps | User-facing interaction |
            | Edge | NGINX, API gateway | Routing, TLS, rate limiting |
            | Core Services | Application services | Business logic |
            | Messaging | Apache Kafka | Decoupling and async work |
            | Storage | PostgreSQL, Redis | Durable state and hot reads |

            ### Component Details

            #### API Gateway
            - Terminates TLS and authenticates every request.
            - Applies per-client rate limits before traffic reaches core services.
            - Scales horizontally behind a load balancer.

            #### Core Service
            - Owns the primary domain workflows and validation.
            - Reads and writes PostgreSQL, caching hot lookups in Redis.
            - Stateless, so capacity is added by adding replicas.
            """),
        new DocSection(
            "Data Model and Schema",
            Kind.MODEL,
            """
            Write exactly these three subsections, keeping the headings verbatim:

            ### Core Entity
            A json code block for the main stored record, with realistic field names and an
            enum-style status field.

            ### Event Payload
            A json code block for the main event this system publishes.

            ### Schema
            A sql code block with CREATE TABLE statements for the main tables, including
            primary keys and the indexes the access patterns actually need. Add a one-line
            comment above each index saying which query it serves.
            """,
            """
            ### Core Entity

            ```json
            {
              "id": "uuid",
              "status": "PENDING | ACTIVE | COMPLETED",
              "created_at": "ISO-8601"
            }
            ```

            ### Event Payload

            ```json
            {
              "event_id": "uuid",
              "entity_id": "uuid",
              "type": "CREATED | UPDATED",
              "occurred_at": "ISO-8601"
            }
            ```

            ### Schema

            ```sql
            CREATE TABLE entities (
                id UUID PRIMARY KEY,
                status TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL
            );

            -- Serves the "recent records by status" listing query.
            CREATE INDEX idx_entities_status_created ON entities (status, created_at DESC);
            ```
            """),
        new DocSection(
            "API Design",
            Kind.MODEL,
            """
            Exactly four endpoint signatures in a single code block, one per line, in the form
            METHOD /path -> response. Keep it terse, the way it would be written on a
            whiteboard. For example:

            ```
            POST /api/v1/rides                 -> 201 { ride_id, status }
            GET  /api/v1/rides/{id}            -> 200 { ride_id, status, driver }
            POST /api/v1/drivers/location      -> 202 accepted
            WS   /api/v1/rides/{id}/updates    -> stream of { status, location }
            ```

            Then a "### Notes" subheading with 3 bullets covering how the write endpoint stays
            idempotent, how the list endpoint paginates, and what is versioned.

            Use this system's own vocabulary in the paths, never the words from the example.
            """,
            """
            ```
            POST /api/v1/resources        -> 201 { id, status }
            GET  /api/v1/resources/{id}   -> 200 { id, status }
            GET  /api/v1/resources        -> 200 { items[], next_cursor }
            DELETE /api/v1/resources/{id} -> 204
            ```

            ### Notes

            - Writes carry a client-supplied idempotency key so retries cannot duplicate.
            - Listing uses cursor pagination, since offset pagination drifts under writes.
            - The version lives in the path so breaking changes can run side by side.
            """),
        new DocSection(
            "Deep Dive: The Hard Part",
            Kind.MODEL,
            """
            Name the single hardest technical problem THIS system faces, and solve it. Write
            exactly these three subsections, keeping the headings verbatim:

            ### The Problem
            2 or 3 sentences on the specific mechanism that breaks - the hot partition, the
            race between two writers, the fanout amplification, the ordering guarantee that
            cannot hold. Not "it must scale".

            ### The Approach
            The design that solves it, step by step, naming the actual technique: consistent
            hashing, optimistic locking with a version column, a lease-based distributed lock,
            a write-ahead log, quorum reads, a sharded counter, geohashing.

            ### Why Not The Simpler Option
            The obvious simpler approach an interviewer will suggest, and the specific reason
            it fails here.

            An interviewer spends more time on this than on anything else in the document.
            Depth matters more here than breadth anywhere else.
            """,
            """
            ### The Problem

            The system's busiest path concentrates on a small number of records, so a single
            partition receives a disproportionate share of writes while the rest sit idle.

            ### The Approach

            Shard on a composite key rather than the natural id, so a hot record spreads across
            several partitions, and reconcile the parts on read. Where two writers can touch the
            same record, use optimistic locking with a version column and retry on conflict.

            ### Why Not The Simpler Option

            A single primary with a read replica is simpler and survives moderate load, but the
            hot partition is a write problem and read replicas do not absorb writes.
            """),
        new DocSection(
            "Tradeoffs",
            Kind.MODEL,
            """
            Pick the THREE tradeoffs from this list that this system genuinely forces a
            decision on, and ignore the rest:

            - Vertical vs Horizontal Scaling
            - Concurrency vs Parallelism
            - Long Polling vs WebSockets
            - Batch vs Stream Processing
            - Stateful vs Stateless Design
            - Strong vs Eventual Consistency
            - Read-Through vs Write-Through Cache
            - Push vs Pull Architecture
            - REST vs RPC
            - Synchronous vs Asynchronous Communication
            - Latency vs Throughput

            For each, write a "#### " heading using the axis name exactly as written above,
            then these three bolded lines:

            - **Chosen**: the side you pick, in one sentence.
            - **Why**: two sentences tying the choice to this system's actual workload.
            - **Cost**: what you give up, and the situation where that would hurt.

            Pick axes from different parts of the stack rather than three variations of the
            same decision. A tradeoff with no real cost is not a tradeoff - name the cost.

            If you pick "Vertical vs Horizontal Scaling", horizontal is the choice and the cost
            is the distributed-systems complexity it brings. Judge each axis against what this
            system's users actually do: a system where people compete for limited inventory,
            see live updates, or expect immediate confirmation is realtime, and calling it a
            batch workload is wrong.
            """,
            """
            #### Strong vs Eventual Consistency

            - **Chosen**: Strong consistency on the primary write path, eventual for derived views.
            - **Why**: Users must never see their own write disappear, so the record of truth is
              read-your-writes consistent. Derived views tolerate lag because nothing irreversible
              depends on them.
            - **Cost**: Cross-region writes pay a coordination penalty, painful if the system later
              needs multi-region active-active writes.

            #### Stateful vs Stateless Design

            - **Chosen**: Stateless services, with all state in the datastore and cache.
            - **Why**: Any instance can serve any request, so scaling out is just adding replicas.
              Deploys and instance loss stop being correctness problems.
            - **Cost**: Every request re-reads state an in-process cache could have held, raising
              datastore load and putting the cache on the critical path.

            #### Synchronous vs Asynchronous Communication

            - **Chosen**: Synchronous on the user-facing path, asynchronous events downstream.
            - **Why**: The user waits on the core action, so it stays a direct call. Notifications
              and analytics do not need to block the response.
            - **Cost**: Async paths are eventually consistent and need idempotent consumers,
              retries, and a dead letter queue to stay debuggable.
            """),
        new DocSection(
            "Bottlenecks and Failure Modes",
            Kind.MODEL,
            """
            A Markdown table with exactly these columns: Bottleneck | Breaks when | Mitigation.
            Give 5 rows, each naming a specific component from the architecture above.

            Then a "### Failure Modes" subheading with 3 bullets, each in the form
            "If X is unavailable: what the user sees, and how the system degrades". Prefer
            honest degradation over claiming nothing breaks.
            """,
            """
            | Bottleneck | Breaks when | Mitigation |
            | --- | --- | --- |
            | Primary database writes | Peak write load exceeds a single primary | Shard by the dominant access key |
            | Cache stampede | A hot key expires under load | Request coalescing and staggered TTLs |
            | Queue consumer lag | Producers outpace consumers | Scale consumers, partition by key |
            | Fanout amplification | One write notifies very many readers | Fan out asynchronously, batch delivery |
            | Connection limits | Realtime clients exceed gateway capacity | Horizontal gateways, connection draining |

            ### Failure Modes

            - If the cache is unavailable: latency rises and the database takes full read load;
              serve stale entries where correctness allows.
            - If the message broker is unavailable: writes still succeed, downstream effects are
              delayed and replayed once the broker recovers.
            - If the primary database is unavailable: writes fail fast with a retryable error
              while reads continue from replicas.
            """),
        new DocSection(
            "Interview Discussion Points",
            Kind.MODEL,
            """
            Write exactly 8 questions an interviewer would ask about THIS design, easiest
            first and hardest last.

            Use NO headings and NO paragraphs in this section. Every line is part of a
            question. Each question is exactly two lines, in this format:

            - **How do you stop two users booking the same seat?**
              *Optimistic locking on a version column, so the second write fails and retries.*

            - **What happens when the cache is unavailable?**
              *Reads fall through to the database, with request coalescing to avoid a stampede.*

            Write 8 in exactly that shape. Copy the LAYOUT of those two examples but never
            their wording - both are about a different system, and reusing either as one of
            your 8 wastes a question. Ask about decisions visible in this document: its storage
            choice, its sharding key, its consistency model, its hot path. Never generic system
            design trivia. The question always ends in a question mark, and the italic line
            below it always names a specific mechanism.
            """,
            """
            - **What is the source of truth for this system?**
              *The primary relational store; caches and derived views can always be rebuilt from it.*
            - **Which workflows must be synchronous?**
              *Only the ones the user waits on; everything else moves to the queue.*
            - **How would you shard the data?**
              *By the dominant access key, so the common query hits a single partition.*
            - **What happens when the cache is cold?**
              *Requests fall through to the database, so coalescing prevents a stampede.*
            - **How do you prevent duplicate writes on retry?**
              *A client-supplied idempotency key, stored and checked before the write commits.*
            - **Where does this design break first under 10x load?**
              *The write path on the hottest partition, before anything else saturates.*
            - **How would you migrate the schema without downtime?**
              *Expand, backfill, switch reads, then contract, keeping both shapes valid meanwhile.*
            - **What would you change if consistency could be relaxed?**
              *Move the write path behind the queue and serve reads from a replica.*
            """));
  }

  private List<DocSection> deliverySections() {
    return List.of(
        new DocSection(
            "Security Considerations",
            Kind.MODEL,
            """
            Write exactly these four subsections, keeping the headings verbatim:

            ### Authentication and Authorization
            3 bullets naming the mechanisms and the roles in this system.

            ### Data Protection
            3 bullets on transport security, encryption at rest, and the personal data this
            specific system holds.

            ### Rate Limiting
            A Markdown table with columns Endpoint Type | Limit, giving 3 concrete limits for
            this system's actual endpoints.

            ### Threat Mitigation
            3 bullets on abuse specific to this domain and how the design counters it.
            """,
            """
            ### Authentication and Authorization

            - JWT bearer tokens on every authenticated request.
            - Role-based access control separating regular and administrative users.
            - Short token lifetimes with refresh tokens.

            ### Data Protection

            - TLS for all client and service-to-service traffic.
            - Encryption at rest for the primary database and backups.
            - Personal data minimised and access audited.

            ### Rate Limiting

            | Endpoint Type | Limit |
            | --- | --- |
            | Write endpoints | 10 req/min per user |
            | Read endpoints | 100 req/min per user |
            | Authentication | 5 attempts/min per IP |

            ### Threat Mitigation

            - Input validation and schema enforcement on every public endpoint.
            - Rate limits and anomaly detection on authentication paths.
            - Audit logging for administrative actions.
            """),
        new DocSection("Testing Strategy", Kind.FIXED, "", testingStrategy()),
        new DocSection("Rollout Plan", Kind.FIXED, "", rolloutPlan()),
        new DocSection("Appendix", Kind.FIXED, "", appendix()));
  }

  private String capacityFallback() {
    return """
        Ollama was unavailable, so no scale assumptions could be gathered for this system.
        Work the estimate by hand: daily active users x actions per user per day gives actions
        per day; divide by 86,400 for average throughput; multiply by the peak factor for the
        figure that actually sizes the system.
        """;
  }

  private String testingStrategy() {
    return """
        ### Unit Testing

        - Service logic covered with dependencies mocked
        - Target: 80% line coverage on core services
        - Frameworks: JUnit 5 and Mockito

        ### Integration Testing

        - Database read and write paths against a real engine, not an in-memory stand-in
        - Message producer and consumer contracts
        - Cache invalidation behaviour under concurrent writes
        - Authentication and authorization on every public endpoint

        ### Load Testing

        | Scenario | Target |
        | --- | --- |
        | Sustained write throughput | 10k requests/sec |
        | Read latency (p99) | < 300 ms |
        | Concurrent connections | 100k |
        | Error rate under peak load | < 0.1% |

        ### Chaos Engineering

        - Primary database failover during sustained write load
        - Cache cluster node loss and cold-start behaviour
        - Network partition between core services
        - Message broker unavailability and consumer backlog recovery
        """;
  }

  private String rolloutPlan() {
    return """
        ### Phase 1: Infrastructure (Week 1-2)

        - [ ] Provision database cluster with replication and automated backups
        - [ ] Deploy cache cluster
        - [ ] Stand up the message broker and create topics with retention policies
        - [ ] Configure load balancers, TLS certificates, and DNS

        ### Phase 2: Core Services (Week 3-4)

        - [ ] Deploy core services to staging
        - [ ] Wire up metrics, logging, and distributed tracing
        - [ ] Run integration and load test suites against staging
        - [ ] Complete security review and dependency audit

        ### Phase 3: Shadow Mode (Week 5)

        - [ ] Mirror production traffic without serving the new system's responses
        - [ ] Compare outputs against the existing system and investigate divergence
        - [ ] Tune capacity, connection pools, and consumer parallelism

        ### Phase 4: Canary Release (Week 6)

        - [ ] Route 5% of traffic to the new system
        - [ ] Watch latency, error rate, and saturation against agreed thresholds
        - [ ] Increase gradually: 5% -> 25% -> 50% -> 100%
        - [ ] Keep a tested rollback path at every step

        ### Phase 5: Full Production (Week 7-8)

        - [ ] Complete traffic migration
        - [ ] Decommission superseded components
        - [ ] Publish runbooks and on-call documentation
        """;
  }

  private String appendix() {
    return """
        ### Monitoring and Alerting

        | Metric | Alert Threshold |
        | --- | --- |
        | Request latency (p99) | > 500 ms for 5 minutes |
        | Error rate | > 1% of requests |
        | Message consumer lag | > 10,000 messages |
        | Database replication lag | > 10 seconds |
        | Cache hit rate | < 80% |

        ### Dependencies
        """;
  }

  /**
   * The dependency table is derived from the technologies the generated sections actually mention,
   * so it stays accurate for this system instead of listing a fixed stack. It runs last because it
   * reads the finished document.
   */
  private void replaceDependencyPlaceholder(StringBuilder document) {
    int marker = document.indexOf("### Dependencies");
    if (marker < 0) {
      return;
    }
    int insertAt = marker + "### Dependencies".length();
    document.insert(insertAt, "\n\n" + dependencyTable(document.substring(0, marker)));
  }

  private String dependencyTable(String documentSoFar) {
    String haystack = documentSoFar.toLowerCase(Locale.ROOT);
    StringBuilder table = new StringBuilder("| Service | Version | Purpose |\n| --- | --- | --- |\n");
    int matches = 0;
    for (Map.Entry<String, String[]> entry : technologyCatalogue().entrySet()) {
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
