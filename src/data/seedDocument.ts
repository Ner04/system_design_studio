export const seedTechnicalDocument = `# Uber Realtime Driver Tracking

## Overview

Design a realtime location platform where riders can see nearby drivers and active trip positions with low latency. The system optimizes for high write volume, geographic locality, and resilient fanout.

## Requirements

### Functional Requirements

- Drivers publish location updates every few seconds.
- Riders receive realtime driver movement during matching and active trips.
- Dispatch services query nearby available drivers.
- Operators can replay recent movement history for support and analytics.

### Non Functional Requirements

- End-to-end location freshness under 2 seconds for active trips.
- Graceful degradation during regional traffic spikes.
- Idempotent ingestion because mobile clients retry aggressively.
- Regional isolation so one city hotspot does not impact global traffic.

## Capacity Estimation

| Metric | Estimate |
| --- | ---: |
| Active drivers | 1,000,000 |
| Update frequency | 1 event / 3 sec |
| Peak ingest | 333k events/sec |
| Hot cache TTL | 5-15 minutes |

## Core Components

- **API Gateway** handles authentication, throttling, and routing.
- **WebSocket Gateway** maintains rider sessions and pushes location deltas.
- **Tracking Service** validates driver pings and publishes immutable events.
- **Kafka Location Stream** decouples ingestion from cache updates, storage, and analytics.
- **Redis GEO** supports low-latency nearby-driver lookup.
- **Cassandra** stores append-heavy location history by driver and time bucket.

## APIs

\`\`\`http
POST /v1/drivers/{driverId}/location
GET /v1/nearby-drivers?lat=37.77&lng=-122.41&radius=3000
WS /v1/trips/{tripId}/location-stream
\`\`\`

## Data Flow

1. Driver sends location ping to the gateway.
2. Tracking service validates the update and publishes to Kafka.
3. Stream consumers update Redis GEO and append history to Cassandra.
4. WebSocket gateways push relevant deltas to subscribed rider sessions.

## Scaling

Partition Kafka topics by geohash or region to preserve locality. Run WebSocket gateways regionally and route users to the closest stable connection pool. Keep Redis GEO as the hot path and Cassandra as durable history.

## Bottlenecks

- Fanout spikes when many riders observe the same area.
- Redis hot keys around airports, stadiums, and events.
- Mobile retry storms during poor network conditions.
- Cross-region routing can add latency and consistency risk.

## Security

Use short-lived auth tokens, per-driver update authorization, request signing for mobile clients, and location privacy policies that limit retention and access.

## Tradeoffs

Redis GEO is fast for proximity lookup but is not the durable source of truth. Kafka adds operational complexity but gives replay, backpressure handling, and independent consumers.

## Interview Discussion Points

- Why use WebSockets instead of polling?
- How should location updates be partitioned?
- What happens if Redis is temporarily unavailable?
- How do we handle duplicate or out-of-order driver pings?
- Where should rate limiting happen?
`;
