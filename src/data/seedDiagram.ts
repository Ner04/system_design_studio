import type { ArchitectureFlowEdge, ArchitectureFlowNode } from "../types/diagram";

export const seedNodes: ArchitectureFlowNode[] = [
  {
    id: "mobile-client",
    type: "architecture",
    position: { x: -460, y: -120 },
    data: {
      label: "Rider App",
      nodeType: "mobile",
      description: "Mobile client streams ride events and receives driver location updates.",
      status: "healthy",
    },
  },
  {
    id: "edge-gateway",
    type: "architecture",
    position: { x: -180, y: -120 },
    data: {
      label: "API Gateway",
      nodeType: "gateway",
      description: "Auth, throttling, routing, and request shaping for public APIs.",
      status: "healthy",
    },
  },
  {
    id: "ws-gateway",
    type: "architecture",
    position: { x: 120, y: -240 },
    data: {
      label: "WebSocket Gateway",
      nodeType: "websocket",
      description: "Maintains long-lived connections for realtime location fanout.",
      status: "healthy",
    },
  },
  {
    id: "tracking-service",
    type: "architecture",
    position: { x: 120, y: 10 },
    data: {
      label: "Tracking Service",
      nodeType: "service",
      description: "Validates driver pings and publishes location events.",
      status: "healthy",
    },
  },
  {
    id: "kafka-stream",
    type: "architecture",
    position: { x: 430, y: 10 },
    data: {
      label: "Kafka Location Stream",
      nodeType: "kafka",
      description: "Durable event backbone for location updates and consumers.",
      status: "warning",
    },
  },
  {
    id: "redis-geo",
    type: "architecture",
    position: { x: 740, y: -145 },
    data: {
      label: "Redis GEO",
      nodeType: "redis",
      description: "Fast nearby-driver lookup and hot location cache.",
      status: "healthy",
    },
  },
  {
    id: "cassandra",
    type: "architecture",
    position: { x: 740, y: 115 },
    data: {
      label: "Cassandra",
      nodeType: "database",
      description: "Wide-column storage for high-volume location history.",
      status: "healthy",
    },
  },
];

export const seedEdges: ArchitectureFlowEdge[] = [
  {
    id: "mobile-to-gateway",
    source: "mobile-client",
    target: "edge-gateway",
    label: "HTTPS",
    animated: true,
  },
  {
    id: "gateway-to-ws",
    source: "edge-gateway",
    target: "ws-gateway",
    label: "Upgrade",
    animated: true,
  },
  {
    id: "gateway-to-tracking",
    source: "edge-gateway",
    target: "tracking-service",
    label: "REST",
  },
  {
    id: "tracking-to-kafka",
    source: "tracking-service",
    target: "kafka-stream",
    label: "publish",
    animated: true,
  },
  {
    id: "kafka-to-redis",
    source: "kafka-stream",
    target: "redis-geo",
    label: "hot index",
  },
  {
    id: "kafka-to-cassandra",
    source: "kafka-stream",
    target: "cassandra",
    label: "append",
  },
  {
    id: "redis-to-ws",
    source: "redis-geo",
    target: "ws-gateway",
    label: "fanout",
    animated: true,
  },
];
