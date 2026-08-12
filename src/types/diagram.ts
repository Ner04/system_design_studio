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
  | "websocket"
  | "aws"
  | "ec2"
  | "lambda"
  | "ecs"
  | "eks"
  | "s3"
  | "rds"
  | "dynamodb"
  | "opensearch"
  | "cloudfront"
  | "apiGateway"
  | "sqs"
  | "sns"
  | "vpc";

import type { Edge, Node } from "@xyflow/react";

export type ArchitectureNodeData = Record<string, unknown> & {
  label: string;
  nodeType: ArchitectureNodeType;
  description?: string;
  status?: "healthy" | "warning" | "critical";
  provider?: string;
  badge?: string;
};

export type ArchitectureEdgeData = {
  label?: string;
};

export type ArchitectureGroupTone =
  | "amber"
  | "blue"
  | "violet"
  | "green"
  | "red"
  | "pink";

export type ArchitectureGroupData = Record<string, unknown> & {
  label: string;
  tone: ArchitectureGroupTone;
  caption?: string;
};

export type ShapeKind = "rectangle" | "roundedRectangle" | "circle" | "diamond";

export type AnnotationTone = "slate" | "blue" | "green" | "amber" | "rose" | "violet";

export type ShapeNodeData = Record<string, unknown> & {
  kind: ShapeKind;
  text: string;
  tone: AnnotationTone;
};

export type TextNodeData = Record<string, unknown> & {
  text: string;
};

export type StickyNoteNodeData = Record<string, unknown> & {
  text: string;
  tone: AnnotationTone;
};

export type CommentNodeData = Record<string, unknown> & {
  text: string;
  author: string;
};

export type ImageNodeData = Record<string, unknown> & {
  src: string;
  text: string;
};

export type FrameNodeData = Record<string, unknown> & {
  text: string;
};

export type ArchitectureFlowNode = Node<ArchitectureNodeData, "architecture">;
export type ArchitectureGroupNode = Node<ArchitectureGroupData, "architectureGroup">;
export type ShapeFlowNode = Node<ShapeNodeData, "shape">;
export type TextFlowNode = Node<TextNodeData, "text">;
export type StickyNoteFlowNode = Node<StickyNoteNodeData, "sticky">;
export type CommentFlowNode = Node<CommentNodeData, "comment">;
export type ImageFlowNode = Node<ImageNodeData, "image">;
export type FrameFlowNode = Node<FrameNodeData, "frame">;

/** Free-form canvas objects drawn with the tool rail, as opposed to architecture components. */
export type AnnotationFlowNode =
  | ShapeFlowNode
  | TextFlowNode
  | StickyNoteFlowNode
  | CommentFlowNode
  | ImageFlowNode
  | FrameFlowNode;

export type ArchitectureDiagramNode =
  | ArchitectureFlowNode
  | ArchitectureGroupNode
  | AnnotationFlowNode;

export type AnnotationNodeType = AnnotationFlowNode["type"];

export const annotationNodeTypes: AnnotationNodeType[] = [
  "shape",
  "text",
  "sticky",
  "comment",
  "image",
  "frame",
];

export function isAnnotationNode(node: ArchitectureDiagramNode): node is AnnotationFlowNode {
  return annotationNodeTypes.includes(node.type as AnnotationNodeType);
}

export type ArchitectureFlowEdge = Edge<ArchitectureEdgeData>;
