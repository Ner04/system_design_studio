import { useEffect, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useReactFlow,
  type NodeTypes,
} from "@xyflow/react";
import { ArchitectureNode } from "./ArchitectureNode";
import { ArchitectureGroupNode } from "./ArchitectureGroupNode";
import { CanvasToolbar } from "./CanvasToolbar";
import { useDiagramStore } from "../store/diagramStore";

const nodeTypes: NodeTypes = {
  architecture: ArchitectureNode as NodeTypes[string],
  architectureGroup: ArchitectureGroupNode as NodeTypes[string],
};

export function DiagramCanvas() {
  const { fitView } = useReactFlow();
  const fitViewRef = useRef(fitView);
  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);
  const query = useDiagramStore((state) => state.query);
  const onNodesChange = useDiagramStore((state) => state.onNodesChange);
  const onEdgesChange = useDiagramStore((state) => state.onEdgesChange);
  const onConnect = useDiagramStore((state) => state.onConnect);
  const selectNode = useDiagramStore((state) => state.selectNode);

  const visibleNodes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return nodes;

    return nodes.map((node) => {
      if (node.type !== "architecture") return node;
      return {
        ...node,
        hidden: !node.data.label.toLowerCase().includes(normalizedQuery),
      };
    });
  }, [nodes, query]);

  useEffect(() => {
    fitViewRef.current = fitView;
  }, [fitView]);

  useEffect(() => {
    const fit = () => fitViewRef.current({ padding: 0.24 });
    const animationFrame = window.requestAnimationFrame(fit);
    const timeout = window.setTimeout(fit, 160);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timeout);
    };
  }, [visibleNodes.length, edges.length]);

  return (
    <section className="relative h-full min-h-0 overflow-hidden bg-ink-950">
      <CanvasToolbar />
      <ReactFlow
        nodes={visibleNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => selectNode(node.id)}
        onPaneClick={() => selectNode(undefined)}
        onInit={(instance) => {
          window.requestAnimationFrame(() => instance.fitView({ padding: 0.24 }));
          window.setTimeout(() => instance.fitView({ padding: 0.24 }), 180);
        }}
        defaultViewport={{ x: 220, y: 120, zoom: 0.72 }}
        minZoom={0.15}
        maxZoom={1.7}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: {
            stroke: "rgba(226, 232, 240, 0.72)",
            strokeWidth: 1.4,
            strokeDasharray: "6 7",
          },
          markerEnd: {
            type: "arrowclosed",
            color: "rgba(226, 232, 240, 0.72)",
          },
        }}
        proOptions={{ hideAttribution: true }}
        className="architecture-canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.25}
          color="rgba(148, 163, 184, 0.18)"
        />
        <Controls
          position="bottom-left"
          className="!bottom-5 !left-5 overflow-hidden !rounded-lg !border !border-white/10 !bg-ink-900/90 !shadow-panel"
        />
      </ReactFlow>
    </section>
  );
}
