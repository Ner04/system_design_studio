import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { create } from "zustand";
import { seedEdges, seedNodes } from "../data/seedDiagram";
import type { AiGraph } from "../types/ai";
import type {
  ArchitectureDiagramNode,
  ArchitectureFlowEdge,
  ArchitectureFlowNode,
  ArchitectureGroupNode,
  ArchitectureNodeType,
} from "../types/diagram";

type ViewMode = "canvas" | "document" | "both";
type ThemeMode = "dark" | "light";

type DiagramState = {
  nodes: ArchitectureDiagramNode[];
  edges: ArchitectureFlowEdge[];
  selectedNodeId?: string;
  query: string;
  viewMode: ViewMode;
  theme: ThemeMode;
  onNodesChange: OnNodesChange<ArchitectureDiagramNode>;
  onEdgesChange: OnEdgesChange<ArchitectureFlowEdge>;
  onConnect: (connection: Connection) => void;
  selectNode: (nodeId?: string) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  addArchitectureNode: (nodeType: ArchitectureNodeType) => void;
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
    types: ["cdn"],
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
    types: ["gateway", "loadBalancer", "websocket"],
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
    types: ["service"],
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
    types: ["queue", "kafka"],
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
    types: ["database", "cache", "redis"],
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
    const tileWidth = 112;
    const tileHeight = 92;
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
  selectedNodeId: "tracking-service",
  query: "",
  viewMode: "canvas",
  theme: "dark",
  onNodesChange: (changes) =>
    set({
      nodes: applyNodeChanges<ArchitectureDiagramNode>(changes, get().nodes),
    }),
  onEdgesChange: (changes) =>
    set({
      edges: applyEdgeChanges<ArchitectureFlowEdge>(changes, get().edges),
    }),
  onConnect: (connection) =>
    set({
      edges: addEdge<ArchitectureFlowEdge>(
        {
          ...connection,
          id: `${connection.source}-${connection.target}-${Date.now()}`,
          animated: true,
        },
        get().edges,
      ),
    }),
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  updateNodeLabel: (nodeId, label) =>
    set({
      nodes: get().nodes.map((node) =>
        node.type === "architecture" && node.id === nodeId
          ? { ...node, data: { ...node.data, label } }
          : node,
      ) as ArchitectureDiagramNode[],
    }),
  addArchitectureNode: (nodeType) => {
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
  replaceGraph: (graph) => {
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
