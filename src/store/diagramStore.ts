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
  ArchitectureFlowEdge,
  ArchitectureFlowNode,
  ArchitectureNodeType,
} from "../types/diagram";

type ViewMode = "canvas" | "document" | "both";
type ThemeMode = "dark" | "light";

type DiagramState = {
  nodes: ArchitectureFlowNode[];
  edges: ArchitectureFlowEdge[];
  selectedNodeId?: string;
  query: string;
  viewMode: ViewMode;
  theme: ThemeMode;
  onNodesChange: OnNodesChange<ArchitectureFlowNode>;
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

export const useDiagramStore = create<DiagramState>((set, get) => ({
  nodes: seedNodes,
  edges: seedEdges,
  selectedNodeId: "tracking-service",
  query: "",
  viewMode: "canvas",
  theme: "dark",
  onNodesChange: (changes) =>
    set({
      nodes: applyNodeChanges<ArchitectureFlowNode>(changes, get().nodes),
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
        node.id === nodeId ? { ...node, data: { ...node.data, label } } : node,
      ),
    }),
  addArchitectureNode: (nodeType) => {
    const nextIndex = get().nodes.length + 1;
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
    const nodes: ArchitectureFlowNode[] = graph.nodes.map((node, index) => ({
      id: node.id,
      type: "architecture",
      position: {
        x: (index % 4) * 300 - 430,
        y: Math.floor(index / 4) * 250 - 160,
      },
      data: {
        label: node.data.label,
        nodeType: node.type,
        description: node.data.description,
        status: "healthy",
      },
    }));

    const edges: ArchitectureFlowEdge[] = graph.edges.map((edge, index) => ({
      id: `${edge.source}-${edge.target}-${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated: index % 2 === 0,
    }));

    set({
      nodes,
      edges,
      selectedNodeId: nodes[0]?.id,
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
