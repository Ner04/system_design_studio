export type ArchitectureNodeType =
  | "service"
  | "database"
  | "cache"
  | "queue"
  | "gateway"
  | "mobile"
  | "cdn"
  | "loadBalancer"
  | "kafka"
  | "redis"
  | "websocket";

import type { Edge, Node } from "@xyflow/react";

export type ArchitectureNodeData = Record<string, unknown> & {
  label: string;
  nodeType: ArchitectureNodeType;
  description?: string;
  status?: "healthy" | "warning" | "critical";
};

export type ArchitectureEdgeData = {
  label?: string;
};

export type ArchitectureFlowNode = Node<ArchitectureNodeData, "architecture">;
export type ArchitectureFlowEdge = Edge<ArchitectureEdgeData>;
