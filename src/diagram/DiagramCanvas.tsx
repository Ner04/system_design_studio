import { useEffect, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type NodeTypes,
} from "@xyflow/react";
import { ArchitectureNode } from "./ArchitectureNode";
import { CanvasToolbar } from "./CanvasToolbar";
import { useDiagramStore } from "../store/diagramStore";

const nodeTypes: NodeTypes = {
  architecture: ArchitectureNode as NodeTypes[string],
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

    return nodes.map((node) => ({
      ...node,
      hidden: !node.data.label.toLowerCase().includes(normalizedQuery),
    }));
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
        defaultViewport={{ x: 60, y: 80, zoom: 0.65 }}
        minZoom={0.15}
        maxZoom={1.7}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "rgba(148, 163, 184, 0.72)", strokeWidth: 1.8 },
          markerEnd: {
            type: "arrowclosed",
            color: "rgba(148, 163, 184, 0.72)",
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
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={3}
          className="!bottom-5 !right-5 !h-28 !w-44 !rounded-lg !border !border-white/10 !bg-ink-900/90 !shadow-panel"
          maskColor="rgba(8, 10, 15, 0.64)"
        />
        <Controls
          position="bottom-left"
          className="!bottom-5 !left-5 overflow-hidden !rounded-lg !border !border-white/10 !bg-ink-900/90 !shadow-panel"
        />
      </ReactFlow>
    </section>
  );
}
