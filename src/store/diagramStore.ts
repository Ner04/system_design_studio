import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { create } from "zustand";
import type { ArchitectureComponent } from "../diagram/componentCatalog";
import { seedEdges, seedNodes } from "../data/seedDiagram";
import type { AiGraph } from "../types/ai";
import type {
  AnnotationTone,
  ArchitectureDiagramNode,
  ArchitectureFlowEdge,
  ArchitectureFlowNode,
  ArchitectureGroupNode,
  ArchitectureNodeType,
  CommentFlowNode,
  FrameFlowNode,
  ImageFlowNode,
  ShapeFlowNode,
  ShapeKind,
  StickyNoteFlowNode,
  TextFlowNode,
} from "../types/diagram";

type ViewMode = "canvas" | "document" | "both";
type ThemeMode = "dark" | "light";

/** Bounding box in flow coordinates, produced by dragging a drawing tool. */
export type DrawRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** The part of the canvas an undo restores. Selection is deliberately excluded. */
type CanvasSnapshot = {
  nodes: ArchitectureDiagramNode[];
  edges: ArchitectureFlowEdge[];
};

/**
 * Every entry pins a full copy of the graph and deep history is rarely used, so the stack is
 * capped rather than left to grow for the length of the session.
 */
const HISTORY_LIMIT = 50;

type DiagramState = {
  nodes: ArchitectureDiagramNode[];
  edges: ArchitectureFlowEdge[];
  past: CanvasSnapshot[];
  future: CanvasSnapshot[];
  selectedNodeId?: string;
  copiedNode?: ArchitectureDiagramNode;
  query: string;
  viewMode: ViewMode;
  theme: ThemeMode;
  /** Records the current canvas before a mutation, so it can be restored. */
  checkpoint: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  onNodesChange: OnNodesChange<ArchitectureDiagramNode>;
  onEdgesChange: OnEdgesChange<ArchitectureFlowEdge>;
  onConnect: (connection: Connection) => void;
  selectNode: (nodeId?: string) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  updateNodeText: (nodeId: string, text: string) => void;
  updateNodeTone: (nodeId: string, tone: AnnotationTone) => void;
  addArchitectureNode: (nodeType: ArchitectureNodeType) => void;
  addArchitectureComponent: (component: ArchitectureComponent, position?: { x: number; y: number }) => void;
  addShapeNode: (kind: ShapeKind, rect: DrawRect) => void;
  addTextNode: (rect: DrawRect) => void;
  addStickyNode: (rect: DrawRect) => void;
  addCommentNode: (rect: DrawRect) => void;
  addImageNode: (src: string, name: string, rect: DrawRect) => void;
  addFrameNode: (rect: DrawRect) => void;
  groupSelected: () => void;
  eraseNode: (nodeId: string) => void;
  eraseEdge: (edgeId: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  pasteCopied: () => void;
  replaceGraph: (graph: AiGraph) => void;
  setQuery: (query: string) => void;
  setViewMode: (viewMode: ViewMode) => void;
  toggleTheme: () => void;
};

const nodeLabels: Record<ArchitectureNodeType, string> = {
  service: "New Service",
  database: "Database",
  cache: "Cache",
  queue: "Queue",
  gateway: "API Gateway",
  mobile: "Mobile App",
  cdn: "CDN",
  loadBalancer: "Load Balancer",
  kafka: "Kafka Topic",
  redis: "Redis Cache",
  websocket: "WebSocket Gateway",
  aws: "AWS Cloud",
  ec2: "EC2",
  lambda: "Lambda",
  ecs: "ECS",
  eks: "EKS",
  s3: "S3",
  rds: "RDS",
  dynamodb: "DynamoDB",
  opensearch: "OpenSearch",
  cloudfront: "CloudFront",
  apiGateway: "API Gateway",
  sqs: "SQS",
  sns: "SNS",
  vpc: "VPC",
};

const groupSections = [
  {
    id: "client-devices",
    label: "Client Devices",
    caption: "User entry points",
    tone: "amber",
    x: -470,
    y: -300,
    width: 240,
    height: 245,
    types: ["mobile"],
  },
  {
    id: "edge-cdn",
    label: "Edge & CDN",
    caption: "Delivery, cache, and perimeter",
    tone: "blue",
    x: -190,
    y: -300,
    width: 285,
    height: 245,
    types: ["cdn", "cloudfront"],
  },
  {
    id: "gateway-layer",
    label: "API Gateway & Load Balancing",
    caption: "Ingress control and traffic shaping",
    tone: "violet",
    x: 135,
    y: -300,
    width: 285,
    height: 245,
    types: ["gateway", "loadBalancer", "websocket", "apiGateway", "vpc"],
  },
  {
    id: "core-services",
    label: "Core Microservices",
    caption: "Domain logic and user-facing workflows",
    tone: "green",
    x: -470,
    y: -15,
    width: 565,
    height: 275,
    types: ["service", "aws", "ec2", "lambda", "ecs", "eks"],
  },
  {
    id: "processing-pipeline",
    label: "Processing Pipeline",
    caption: "Async work, streams, and jobs",
    tone: "red",
    x: 135,
    y: -15,
    width: 285,
    height: 275,
    types: ["queue", "kafka", "sqs", "sns"],
  },
  {
    id: "data-storage",
    label: "Databases & Storage",
    caption: "Durable state, cache, search, and events",
    tone: "pink",
    x: -470,
    y: 300,
    width: 890,
    height: 190,
    types: ["database", "cache", "redis", "s3", "rds", "dynamodb", "opensearch"],
  },
] as const;

type GroupSection = (typeof groupSections)[number];
type GroupSectionId = GroupSection["id"];

const sectionByType = new Map<ArchitectureNodeType, GroupSection>(
  groupSections.flatMap((section) =>
    section.types.map((nodeType) => [nodeType as ArchitectureNodeType, section] as const),
  ),
);

function isArchitectureNode(node: ArchitectureDiagramNode): node is ArchitectureFlowNode {
  return node.type === "architecture";
}

let drawCounter = 0;

function nextDrawId(prefix: string) {
  drawCounter += 1;
  return `${prefix}-${drawCounter}-${Date.now().toString(36)}`;
}

/**
 * React Flow stores a child node's position relative to its parent. Anything that
 * lifts a node out of its parent (duplicate, paste, ungroup) has to add the parent
 * offsets back in, or the copy lands near the canvas origin instead of next to the
 * original.
 */
function absolutePosition(node: ArchitectureDiagramNode, nodes: ArchitectureDiagramNode[]) {
  const nodesById = new Map(nodes.map((candidate) => [candidate.id, candidate]));
  let { x, y } = node.position;
  let parentId = node.parentId;
  const visited = new Set<string>([node.id]);

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = nodesById.get(parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentId;
  }

  return { x, y };
}

function nodeSize(node: ArchitectureDiagramNode) {
  return {
    width: node.measured?.width ?? node.width ?? Number(node.style?.width ?? 124),
    height: node.measured?.height ?? node.height ?? Number(node.style?.height ?? 96),
  };
}

/** Detaches a node from its parent so it can live at the top level of the canvas. */
function detachFromParent(
  node: ArchitectureDiagramNode,
  nodes: ArchitectureDiagramNode[],
  offset: number,
) {
  const origin = absolutePosition(node, nodes);
  return {
    parentId: undefined,
    extent: undefined,
    position: { x: origin.x + offset, y: origin.y + offset },
  };
}

/** Only architecture nodes carry a `label`; drawable nodes carry `text`. */
function withCopySuffix(data: Record<string, unknown>) {
  if (typeof data.label === "string") {
    return { ...data, label: `${data.label} Copy` };
  }
  return { ...data };
}

function selectedIds(nodes: ArchitectureDiagramNode[], selectedNodeId?: string) {
  const ids = new Set(nodes.filter((node) => node.selected).map((node) => node.id));
  if (selectedNodeId) ids.add(selectedNodeId);
  return ids;
}

/** Expands a set of node ids to include everything parented to them. */
function withDescendants(ids: Set<string>, nodes: ArchitectureDiagramNode[]) {
  const doomed = new Set(ids);
  let didGrow = true;

  while (didGrow) {
    didGrow = false;
    for (const node of nodes) {
      if (node.parentId && doomed.has(node.parentId) && !doomed.has(node.id)) {
        doomed.add(node.id);
        didGrow = true;
      }
    }
  }

  return doomed;
}

function removeNodes(state: Pick<DiagramState, "nodes" | "edges">, ids: Set<string>) {
  return {
    nodes: state.nodes.filter((node) => !ids.has(node.id)),
    edges: state.edges.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target)),
  };
}

/** Clears selection everywhere, then drops the freshly created node in as selected. */
function appendSelected(nodes: ArchitectureDiagramNode[], node: ArchitectureDiagramNode) {
  return [...nodes.map((existing) => ({ ...existing, selected: false })), node];
}

function sectionForNode(node: AiGraph["nodes"][number]) {
  return sectionByType.get(node.type) ?? groupSections[3];
}

function buildGroupedNodes(graphNodes: AiGraph["nodes"]): ArchitectureDiagramNode[] {
  const nodesBySection = graphNodes.reduce(
    (groups, node) => {
      const section = sectionForNode(node);
      groups[section.id] = [...(groups[section.id] ?? []), node];
      return groups;
    },
    {} as Partial<Record<GroupSectionId, AiGraph["nodes"]>>,
  );

  const activeSections = groupSections.filter((section) => nodesBySection[section.id]?.length);
  const groupNodes: ArchitectureGroupNode[] = activeSections.map((section) => ({
    id: section.id,
    type: "architectureGroup",
    position: { x: section.x, y: section.y },
    draggable: false,
    selectable: false,
    zIndex: 0,
    style: { width: section.width, height: section.height },
    data: {
      label: section.label,
      caption: section.caption,
      tone: section.tone,
    },
  }));

  const componentNodes: ArchitectureFlowNode[] = activeSections.flatMap((section) => {
    const sectionNodes = nodesBySection[section.id] ?? [];
    const columns = section.width >= 760 ? 6 : section.width >= 480 ? 4 : 2;
    const tileWidth = 124;
    const tileHeight = 96;
    const gapX = Math.max(18, Math.floor((section.width - 56 - columns * tileWidth) / Math.max(columns - 1, 1)));
    const gapY = 28;

    return sectionNodes.map((node, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return {
        id: node.id,
        type: "architecture",
        parentId: section.id,
        extent: "parent",
        position: {
          x: 28 + column * (tileWidth + gapX),
          y: 56 + row * (tileHeight + gapY),
        },
        zIndex: 10,
        data: {
          label: node.data.label,
          nodeType: node.type,
          description: node.data.description,
          status: "healthy",
        },
      };
    });
  });

  return [...groupNodes, ...componentNodes];
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: seedNodes,
  edges: seedEdges,
  past: [],
  future: [],
  selectedNodeId: "tracking-service",
  copiedNode: undefined,
  query: "",
  viewMode: "canvas",
  theme: "dark",

  checkpoint: () => {
    const { nodes, edges, past } = get();
    set({
      past: [...past, { nodes, edges }].slice(-HISTORY_LIMIT),
      // Any new edit abandons the redo branch, the same as every editor behaves.
      future: [],
    });
  },

  undo: () => {
    const { past, future, nodes, edges } = get();
    const previous = past[past.length - 1];
    if (!previous) return;

    set({
      nodes: previous.nodes,
      edges: previous.edges,
      past: past.slice(0, -1),
      future: [{ nodes, edges }, ...future].slice(0, HISTORY_LIMIT),
      // The selected node may no longer exist in the restored graph.
      selectedNodeId: undefined,
    });
  },

  redo: () => {
    const { past, future, nodes, edges } = get();
    const next = future[0];
    if (!next) return;

    set({
      nodes: next.nodes,
      edges: next.edges,
      past: [...past, { nodes, edges }].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      selectedNodeId: undefined,
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  onNodesChange: (changes) =>
    set({
      nodes: applyNodeChanges<ArchitectureDiagramNode>(changes, get().nodes),
    }),
  onEdgesChange: (changes) =>
    set({
      edges: applyEdgeChanges<ArchitectureFlowEdge>(changes, get().edges),
    }),
  onConnect: (connection) => {
    get().checkpoint();
    set({
      edges: addEdge<ArchitectureFlowEdge>(
        {
          ...connection,
          id: `${connection.source}-${connection.target}-${Date.now()}`,
          animated: true,
        },
        get().edges,
      ),
    });
  },
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  updateNodeLabel: (nodeId, label) => {
    get().checkpoint();
    set({
      nodes: get().nodes.map((node) =>
        node.type === "architecture" && node.id === nodeId
          ? { ...node, data: { ...node.data, label } }
          : node,
      ) as ArchitectureDiagramNode[],
    });
  },
  updateNodeText: (nodeId, text) => {
    get().checkpoint();
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, text } } : node,
      ) as ArchitectureDiagramNode[],
    });
  },
  updateNodeTone: (nodeId, tone) => {
    get().checkpoint();
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, tone } } : node,
      ) as ArchitectureDiagramNode[],
    });
  },
  addArchitectureNode: (nodeType) => {
    get().checkpoint();
    const nextIndex = get().nodes.filter(isArchitectureNode).length + 1;
    const node: ArchitectureFlowNode = {
    id: `${nodeType}-${nextIndex}`,
    type: "architecture",
    position: {
      x: Math.round(Math.random() * 280 - 60),
      y: Math.round(Math.random() * 220 - 80),
    },
    data: {
      label: nodeLabels[nodeType],
      nodeType,
      description: "New architecture component. Edit the label and connect it to the flow.",
      status: "healthy",
    },
    };

    set({
    nodes: [...get().nodes, node],
    selectedNodeId: node.id,
    });
  },
  addArchitectureComponent: (component, position) => {
    get().checkpoint();
    const existingNodes = get().nodes.filter(isArchitectureNode);
    const nextIndex = existingNodes.length + 1;
    const node: ArchitectureFlowNode = {
    id: `${component.id}-${nextIndex}`,
    type: "architecture",
    position: position ?? {
      x: Math.round(Math.random() * 360 - 120),
      y: Math.round(Math.random() * 260 - 90),
    },
    data: {
      label: component.label,
      nodeType: component.nodeType,
      description: component.description,
      status: "healthy",
      provider: component.provider,
      badge: component.badge,
    },
    };

    set({
    nodes: [...get().nodes, node],
    selectedNodeId: node.id,
    viewMode: "canvas",
    });
  },
  addShapeNode: (kind, rect) => {
    get().checkpoint();
    const node: ShapeFlowNode = {
    id: nextDrawId(kind),
    type: "shape",
    position: { x: rect.x, y: rect.y },
    style: { width: rect.width, height: rect.height },
    zIndex: 6,
    selected: true,
    data: { kind, text: "", tone: "blue" },
    };

    set({ nodes: appendSelected(get().nodes, node), selectedNodeId: node.id });
  },
  addTextNode: (rect) => {
    get().checkpoint();
    const node: TextFlowNode = {
    id: nextDrawId("text"),
    type: "text",
    position: { x: rect.x, y: rect.y },
    style: { width: rect.width, height: rect.height },
    zIndex: 8,
    selected: true,
    data: { text: "" },
    };

    set({ nodes: appendSelected(get().nodes, node), selectedNodeId: node.id });
  },
  addStickyNode: (rect) => {
    get().checkpoint();
    const node: StickyNoteFlowNode = {
    id: nextDrawId("sticky"),
    type: "sticky",
    position: { x: rect.x, y: rect.y },
    style: { width: rect.width, height: rect.height },
    zIndex: 8,
    selected: true,
    data: { text: "", tone: "amber" },
    };

    set({ nodes: appendSelected(get().nodes, node), selectedNodeId: node.id });
  },
  addCommentNode: (rect) => {
    get().checkpoint();
    const node: CommentFlowNode = {
    id: nextDrawId("comment"),
    type: "comment",
    position: { x: rect.x, y: rect.y },
    style: { width: rect.width, height: rect.height },
    zIndex: 9,
    selected: true,
    data: { text: "", author: "You" },
    };

    set({ nodes: appendSelected(get().nodes, node), selectedNodeId: node.id });
  },
  addImageNode: (src, name, rect) => {
    get().checkpoint();
    const node: ImageFlowNode = {
    id: nextDrawId("image"),
    type: "image",
    position: { x: rect.x, y: rect.y },
    style: { width: rect.width, height: rect.height },
    zIndex: 7,
    selected: true,
    data: { src, text: name },
    };

    set({ nodes: appendSelected(get().nodes, node), selectedNodeId: node.id });
  },
  addFrameNode: (rect) => {
    get().checkpoint();
    const node: FrameFlowNode = {
    id: nextDrawId("frame"),
    type: "frame",
    position: { x: rect.x, y: rect.y },
    style: { width: rect.width, height: rect.height },
    // Frames are containers, so they sit behind everything drawn on top of them.
    zIndex: 1,
    selected: true,
    data: { text: "Frame" },
    };

    set({ nodes: appendSelected(get().nodes, node), selectedNodeId: node.id });
  },
  groupSelected: () => {
    get().checkpoint();
    const { nodes } = get();
    const targets = nodes.filter(
    (node) => node.selected && node.type !== "architectureGroup" && node.type !== "frame",
    );
    if (targets.length < 2) return;

    const boxes = targets.map((node) => {
    const origin = absolutePosition(node, nodes);
    const size = nodeSize(node);
    return { origin, size };
    });

    const padding = 26;
    const headerHeight = 34;
    const minX = Math.min(...boxes.map((box) => box.origin.x)) - padding;
    const minY = Math.min(...boxes.map((box) => box.origin.y)) - headerHeight;
    const maxX = Math.max(...boxes.map((box) => box.origin.x + box.size.width)) + padding;
    const maxY = Math.max(...boxes.map((box) => box.origin.y + box.size.height)) + padding;

    const frame: FrameFlowNode = {
    id: nextDrawId("frame"),
    type: "frame",
    position: { x: minX, y: minY },
    style: { width: maxX - minX, height: maxY - minY },
    zIndex: 1,
    data: { text: "Group" },
    };

    const targetIds = new Set(targets.map((node) => node.id));
    const reparented = nodes.map((node) => {
    if (!targetIds.has(node.id)) return node;
    const origin = absolutePosition(node, nodes);
    return {
      ...node,
      parentId: frame.id,
      position: { x: origin.x - minX, y: origin.y - minY },
      selected: false,
    };
    }) as ArchitectureDiagramNode[];

    // The frame has to precede its children in the array or React Flow cannot
    // resolve the parent when it lays the children out.
    set({ nodes: [frame, ...reparented], selectedNodeId: frame.id });
  },
  eraseNode: (nodeId) => {
    get().checkpoint();
    const { nodes, edges, selectedNodeId } = get();
    const doomed = withDescendants(new Set([nodeId]), nodes);

    set({
    ...removeNodes({ nodes, edges }, doomed),
    selectedNodeId: selectedNodeId && doomed.has(selectedNodeId) ? undefined : selectedNodeId,
    });
  },
  eraseEdge: (edgeId) => {
    get().checkpoint();
    set({ edges: get().edges.filter((edge) => edge.id !== edgeId) });
  },
  deleteSelected: () => {
    get().checkpoint();
    const { selectedNodeId, nodes, edges } = get();
    const doomed = withDescendants(selectedIds(nodes, selectedNodeId), nodes);
    if (!doomed.size) return;

    set({
    ...removeNodes({ nodes, edges }, doomed),
    selectedNodeId: undefined,
    });
  },
  duplicateSelected: () => {
    get().checkpoint();
    const { nodes, selectedNodeId } = get();
    const selected = nodes.find(
    (node) => node.id === selectedNodeId && node.type !== "architectureGroup",
    );
    if (!selected) return;

    const duplicate = {
    ...selected,
    ...detachFromParent(selected, nodes, 36),
    id: `${selected.id}-copy-${Date.now()}`,
    data: withCopySuffix(selected.data),
    selected: true,
    } as ArchitectureDiagramNode;

    set({
    nodes: appendSelected(nodes, duplicate),
    selectedNodeId: duplicate.id,
    viewMode: "canvas",
    });
  },
  copySelected: () => {
    const { nodes, selectedNodeId } = get();
    const selected = nodes.find(
      (node) => node.id === selectedNodeId && node.type !== "architectureGroup",
    );
    if (!selected) return;

    // Store the copy already detached, so the offset is applied in absolute space
    // no matter how many times it is pasted.
    set({
      copiedNode: {
        ...selected,
        ...detachFromParent(selected, nodes, 0),
      } as ArchitectureDiagramNode,
    });
  },
  pasteCopied: () => {
    get().checkpoint();
    const { nodes, copiedNode } = get();
    if (!copiedNode) return;

    const pasted = {
    ...copiedNode,
    id: `${copiedNode.id}-paste-${Date.now()}`,
    position: {
      x: copiedNode.position.x + 48,
      y: copiedNode.position.y + 48,
    },
    selected: true,
    } as ArchitectureDiagramNode;

    set({
    nodes: appendSelected(nodes, pasted),
    selectedNodeId: pasted.id,
    copiedNode: pasted,
    viewMode: "canvas",
    });
  },
  replaceGraph: (graph) => {
    get().checkpoint();
    const nodes = buildGroupedNodes(graph.nodes);

    const edges: ArchitectureFlowEdge[] = graph.edges.map((edge, index) => ({
    id: `${edge.source}-${edge.target}-${index}`,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: index % 2 === 0,
    labelStyle: {
      fill: "rgba(226, 232, 240, 0.95)",
      fontSize: 10,
      fontWeight: 600,
    },
    labelBgStyle: {
      fill: "rgba(8, 10, 15, 0.86)",
    },
    labelBgPadding: [5, 3],
    labelBgBorderRadius: 4,
    }));

    set({
    nodes,
    edges,
    selectedNodeId: nodes.find(isArchitectureNode)?.id,
    query: "",
    viewMode: "both",
    });
  },
  setQuery: (query) => set({ query }),
  setViewMode: (viewMode) => set({ viewMode }),
  toggleTheme: () =>
    set({
      theme: get().theme === "dark" ? "light" : "dark",
    }),
}));
