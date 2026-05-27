import type { AiGenerationResponse, AiGraph } from "../types/ai";

type MockDesign = {
  title: string;
  graph: AiGraph;
  markdown: string;
  explanation: string[];
  interviewQuestions: string[];
};

export function localMockDesign(prompt: string, model = "mock-local"): AiGenerationResponse {
  const design = selectDesign(prompt);
  return {
    status: "MOCK_AI",
    message: "Generated deterministic local mock output.",
    model,
    title: design.title,
    graph: design.graph,
    markdown: design.markdown,
    explanation: design.explanation,
    interviewQuestions: design.interviewQuestions,
  };
}

function selectDesign(prompt: string): MockDesign {
  const normalized = prompt.toLowerCase();
  if (normalized.includes("url") || normalized.includes("shortener") || normalized.includes("shortner")) return urlShortener;
  if (normalized.includes("whatsapp") || normalized.includes("chat")) return whatsapp;
  if (normalized.includes("netflix") || normalized.includes("stream")) return netflix;
  if (normalized.includes("youtube") || normalized.includes("recommend")) return youtube;
  if (normalized.includes("uber") || (normalized.includes("driver") && normalized.includes("tracking"))) return uber;
  return genericDesign(prompt);
}

const uber: MockDesign = {
  title: "Uber Realtime Driver Tracking",
  graph: {
    nodes: [
      node("driver-app", "mobile", "Driver App", "Publishes driver GPS updates."),
      node("rider-app", "mobile", "Rider App", "Receives realtime trip positions."),
      node("gateway", "gateway", "API Gateway", "Authenticates and rate limits mobile requests."),
      node("tracking", "service", "Tracking Service", "Validates and normalizes location events."),
      node("ws", "websocket", "WebSocket Gateway", "Maintains rider subscriptions."),
      node("kafka", "kafka", "Kafka Location Stream", "Durable event backbone."),
      node("redis", "redis", "Redis GEO", "Caches active driver locations."),
      node("cassandra", "database", "Cassandra", "Stores location history."),
    ],
    edges: [
      edge("driver-app", "gateway", "HTTPS"),
      edge("gateway", "tracking", "REST"),
      edge("rider-app", "ws", "subscribe"),
      edge("tracking", "kafka", "publish"),
      edge("kafka", "redis", "hot index"),
      edge("kafka", "cassandra", "append"),
      edge("redis", "ws", "location delta"),
    ],
  },
  markdown: designDoc("Uber Realtime Driver Tracking", "WebSockets, Kafka, Redis GEO, and Cassandra support low-latency driver tracking with durable replay and hot proximity lookup."),
  explanation: ["Kafka absorbs mobile spikes.", "Redis GEO powers nearby-driver lookup.", "WebSockets reduce polling overhead."],
  interviewQuestions: ["Why WebSockets?", "How should location events be partitioned?", "What if Redis is unavailable?"],
};

const urlShortener: MockDesign = {
  title: "URL Shortener",
  graph: {
    nodes: [
      node("client", "mobile", "Web/Mobile Client", "Creates short links and follows redirects."),
      node("gateway", "gateway", "API Gateway", "Authenticates creators and rate limits traffic."),
      node("short-link", "service", "Short Link Service", "Validates URLs and creates short codes."),
      node("redirect", "service", "Redirect Service", "Resolves short codes with low latency."),
      node("id-generator", "service", "ID Generator", "Allocates collision-resistant Base62 codes."),
      node("link-store", "database", "Link Store", "Persists code-to-URL mappings."),
      node("cache", "redis", "Redirect Cache", "Caches popular short-code lookups."),
      node("clicks", "kafka", "Click Event Stream", "Captures redirect analytics asynchronously."),
      node("analytics", "service", "Analytics Service", "Aggregates click metrics and abuse signals."),
    ],
    edges: [
      edge("client", "gateway", "HTTPS"),
      edge("gateway", "short-link", "create"),
      edge("short-link", "id-generator", "allocate code"),
      edge("short-link", "link-store", "persist"),
      edge("client", "redirect", "GET /{code}"),
      edge("redirect", "cache", "cache lookup"),
      edge("redirect", "link-store", "cache miss"),
      edge("redirect", "clicks", "async click"),
      edge("clicks", "analytics", "aggregate"),
    ],
  },
  markdown: designDoc("URL Shortener", "A URL shortener creates compact aliases, serves very fast redirects, caches hot mappings, and records click analytics asynchronously."),
  explanation: ["Redirect lookup is the latency-critical path.", "Redis protects the database for hot links.", "Analytics are streamed so redirects stay fast."],
  interviewQuestions: ["How do you avoid code collisions?", "When should redirects use 301 vs 302?", "How do you block malicious URLs?"],
};

const whatsapp: MockDesign = {
  title: "WhatsApp Chat System",
  graph: {
    nodes: [
      node("client", "mobile", "Mobile Client", "Sends and receives messages."),
      node("gateway", "gateway", "API Gateway", "Authenticates users."),
      node("chat", "service", "Chat Service", "Handles conversation writes."),
      node("presence", "service", "Presence Service", "Tracks online state."),
      node("queue", "queue", "Message Queue", "Buffers fanout and retries."),
      node("realtime", "websocket", "Realtime Gateway", "Pushes live messages."),
      node("messages", "database", "Message Store", "Persists chat history."),
      node("cache", "cache", "Session Cache", "Maps users to active devices."),
    ],
    edges: [
      edge("client", "gateway", "HTTPS"),
      edge("gateway", "chat", "send"),
      edge("gateway", "presence", "presence"),
      edge("chat", "messages", "persist"),
      edge("chat", "queue", "fanout"),
      edge("queue", "realtime", "deliver"),
      edge("cache", "realtime", "route"),
    ],
  },
  markdown: designDoc("WhatsApp Chat System", "A chat backend separates durable message writes, online presence, retryable fanout, and realtime delivery."),
  explanation: ["Queues smooth group fanout.", "Presence is hot and ephemeral.", "Message storage is the source of truth."],
  interviewQuestions: ["How do you preserve ordering?", "How does offline delivery work?", "Where does encryption fit?"],
};

const netflix: MockDesign = {
  title: "Netflix Streaming Architecture",
  graph: {
    nodes: [
      node("client", "mobile", "Client Apps", "Browses and plays content."),
      node("cdn", "cdn", "CDN Edge", "Serves video segments."),
      node("gateway", "gateway", "API Gateway", "Routes playback APIs."),
      node("catalog", "service", "Catalog Service", "Serves metadata."),
      node("playback", "service", "Playback Service", "Issues manifests."),
      node("recs", "service", "Recommendation Service", "Ranks rows."),
      node("events", "kafka", "Viewing Event Stream", "Captures telemetry."),
      node("metadata", "database", "Metadata DB", "Stores titles and rights."),
      node("cache", "cache", "Edge Cache", "Caches manifests."),
    ],
    edges: [
      edge("client", "cdn", "segments"),
      edge("client", "gateway", "API"),
      edge("gateway", "catalog", "browse"),
      edge("gateway", "playback", "manifest"),
      edge("catalog", "metadata", "metadata"),
      edge("playback", "cache", "cache"),
      edge("client", "events", "telemetry"),
      edge("events", "recs", "features"),
    ],
  },
  markdown: designDoc("Netflix Streaming Architecture", "A streaming platform uses CDN-heavy delivery with independent metadata, playback, recommendation, and telemetry paths."),
  explanation: ["CDN is the primary scaling layer.", "Telemetry should never block playback.", "Manifest caching reduces startup latency."],
  interviewQuestions: ["Why separate CDN from APIs?", "How do you reduce startup time?", "How do recommendations update?"],
};

const youtube: MockDesign = {
  title: "YouTube Recommendation System",
  graph: {
    nodes: [
      node("client", "mobile", "Web/Mobile Client", "Requests feed and emits events."),
      node("gateway", "gateway", "API Gateway", "Routes feed APIs."),
      node("feed", "service", "Feed Service", "Builds personalized feeds."),
      node("candidate", "service", "Candidate Generator", "Fetches possible videos."),
      node("ranking", "service", "Ranking Service", "Scores candidates."),
      node("features", "database", "Feature Store", "Serves user/video features."),
      node("events", "kafka", "Engagement Stream", "Collects watches and likes."),
      node("cache", "cache", "Feed Cache", "Caches short-lived pages."),
    ],
    edges: [
      edge("client", "gateway", "feed request"),
      edge("gateway", "feed", "GET /feed"),
      edge("feed", "candidate", "candidates"),
      edge("feed", "ranking", "rank"),
      edge("ranking", "features", "features"),
      edge("feed", "cache", "cache"),
      edge("client", "events", "events"),
      edge("events", "features", "updates"),
    ],
  },
  markdown: designDoc("YouTube Recommendation System", "Recommendation serving combines candidate generation, ranking, feature stores, event streams, and short-lived feed caching."),
  explanation: ["Candidate generation narrows search space.", "Feature freshness impacts relevance.", "Caching protects ranking services."],
  interviewQuestions: ["How do candidate generation and ranking differ?", "How do you handle cold starts?", "How fresh should features be?"],
};

function node(id: string, type: AiGraph["nodes"][number]["type"], label: string, description: string) {
  return { id, type, data: { label, description } };
}

function edge(source: string, target: string, label: string) {
  return { source, target, label };
}

function designDoc(title: string, overview: string) {
  return `# ${title}

## Overview

${overview}

## Requirements

### Functional Requirements

- Accept user-facing requests.
- Process core system events.
- Persist durable state.
- Serve low-latency read paths.

### Non Functional Requirements

- Horizontal scalability.
- High availability.
- Low tail latency.
- Clear operational boundaries.

## Capacity Estimation

| Metric | Mock Estimate |
| --- | ---: |
| Peak traffic | 250k events/sec |
| Availability | 99.95% |
| Hot cache TTL | 5-30 minutes |

## Core Components

- Gateway layer protects public ingress.
- Domain services own business logic.
- Event stream decouples producers and consumers.
- Cache accelerates hot read paths.
- Database stores durable source-of-truth state.

## APIs

\`\`\`http
POST /v1/events
GET /v1/resources/{id}
WS /v1/realtime/{channel}
\`\`\`

## Scaling

Partition traffic by tenant, region, or workload-specific key. Keep realtime and durable write paths isolated so spikes do not cascade.

## Bottlenecks

- Hot keys and regional spikes.
- Large fanout operations.
- Cache invalidation.
- Downstream retry storms.

## Security

Use short-lived tokens, input validation, rate limits, encryption in transit, and least-privilege service access.

## Tradeoffs

Mock generation favors clean interview structure over exhaustive implementation detail. Phase 5 will use local Ollama models for custom depth.

## Interview Discussion Points

- What is the source of truth?
- Which path must be realtime?
- How do you handle retries?
- Where would you add backpressure?
`;
}

function genericDesign(prompt: string): MockDesign {
  const title = titleFromPrompt(prompt);
  const systemName = title.toLowerCase();
  const graph: AiGraph = {
    nodes: [
      node("client-app", "mobile", "Client App", `Users interact with the ${systemName} through web or mobile screens.`),
      node("api-gateway", "gateway", "API Gateway", "Authenticates users, applies rate limits, and routes requests."),
      node("core-service", "service", `${title} Service`, "Owns the core workflows and business rules."),
      node("worker-service", "service", "Background Worker", "Runs async jobs, notifications, imports, and scheduled tasks."),
      node("primary-db", "database", "Primary Database", "Stores durable application records and transactional state."),
      node("cache", "redis", "Read Cache", "Caches hot objects, sessions, and computed views."),
      node("event-queue", "queue", "Event Queue", "Decouples write paths from background processing."),
      node("object-storage", "database", "Object Storage", "Stores files, exports, media, and large artifacts."),
      node("observability", "service", "Observability", "Collects logs, metrics, traces, and audit events."),
    ],
    edges: [
      edge("client-app", "api-gateway", "HTTPS"),
      edge("api-gateway", "core-service", "REST"),
      edge("core-service", "primary-db", "read/write"),
      edge("core-service", "cache", "hot reads"),
      edge("core-service", "event-queue", "publish events"),
      edge("event-queue", "worker-service", "consume jobs"),
      edge("worker-service", "object-storage", "store artifacts"),
      edge("core-service", "observability", "telemetry"),
      edge("worker-service", "observability", "job metrics"),
    ],
  };

  return {
    title,
    graph,
    markdown: genericDesignDoc(title, prompt),
    explanation: [
      "Generated from the prompt instead of a canned design.",
      "The core path stays simple: client, gateway, service, database.",
      "Background work is isolated through a queue so user requests stay responsive.",
    ],
    interviewQuestions: [
      `What is the source of truth for ${systemName}?`,
      "Which workflows must be synchronous?",
      "What data should be cached and for how long?",
      "How would you handle retries and duplicate jobs?",
    ],
  };
}

function titleFromPrompt(prompt: string) {
  const normalized = prompt
    .replace(/^\s*(design|create|build|make|generate|document|documentation\s+for)\s+/i, "")
    .replace(/[^\w\s-]/g, " ")
    .trim();
  const words = (normalized || "Generated System Design").split(/\s+/).slice(0, 6);
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}

function genericDesignDoc(title: string, prompt: string) {
  const systemName = title.toLowerCase();
  return `# ${title}

## Overview

This document describes a practical backend architecture for ${systemName}. Prompt: "${prompt.trim() || title}".

## Requirements

### Functional Requirements

- Create, update, search, and manage ${systemName} records.
- Support authenticated users and role-aware access.
- Run asynchronous jobs without blocking user requests.
- Expose audit trails and operational dashboards.

### Non Functional Requirements

- Horizontal scalability for stateless services.
- High availability across critical user paths.
- Low tail latency for common reads and writes.
- Durable storage with backup and recovery.

## Capacity Estimation

| Metric | Starting Estimate |
| --- | ---: |
| Daily active users | 100k-1M |
| Peak API traffic | 5k-50k req/sec |
| Availability target | 99.9%-99.95% |
| Hot cache TTL | 5-30 minutes |

## Core Components

- Client App sends authenticated requests.
- API Gateway handles auth, rate limits, and routing.
- ${title} Service owns domain workflows and validation.
- Primary Database stores durable source-of-truth records.
- Read Cache serves hot views and sessions.
- Event Queue decouples slow work from request latency.
- Background Worker processes notifications, imports, exports, and scheduled jobs.
- Observability collects logs, metrics, traces, and audit events.

## APIs

\`\`\`http
POST /v1/${slugify(title)}
GET /v1/${slugify(title)}/{id}
PATCH /v1/${slugify(title)}/{id}
GET /v1/${slugify(title)}?query=
POST /v1/${slugify(title)}/{id}/events
\`\`\`

## Database Design

Use relational tables for transactional records, ownership, permissions, and audit history. Add secondary indexes around the dominant lookup keys, and store large files or generated exports in object storage.

## Scaling

Scale stateless services horizontally, partition high-volume tables around tenant or domain identifiers, cache hot reads, and move slow workflows to queue-backed workers.

## Bottlenecks

- Hot search queries and dashboard reads.
- Large imports or exports.
- Background job backlog.
- Database lock contention.
- Cache invalidation after updates.

## Security

Use short-lived tokens, role-based access control, input validation, rate limits, encryption in transit, encrypted secrets, and audit logs for sensitive actions.

## Tradeoffs

A single domain service is simpler to build and debug early. Split it later only when parts of ${systemName} need independent scaling, ownership, or deployment.

## Interview Discussion Points

- What is the source of truth?
- Which workflows must be synchronous?
- How should data be partitioned?
- What should be cached and for how long?
- How should retries and duplicate jobs be handled?
`;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "resources";
}
