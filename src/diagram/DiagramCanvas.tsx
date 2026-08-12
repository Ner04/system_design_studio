import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type NodeTypes,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import { ArchitectureNode } from "./ArchitectureNode";
import { ArchitectureGroupNode } from "./ArchitectureGroupNode";
import {
  CommentNode,
  FrameNode,
  ImageNode,
  ShapeNode,
  StickyNoteNode,
  TextNode,
} from "./AnnotationNodes";
import { CanvasToolbar } from "./CanvasToolbar";
import { ComponentLibraryPanel } from "./ComponentLibraryPanel";
import { DrawLayer } from "./DrawLayer";
import { isDrawTool } from "./drawTools";
import { EraserToolRail, type CanvasTool } from "./EraserToolRail";
import { useDiagramStore } from "../store/diagramStore";

const nodeTypes: NodeTypes = {
  architecture: ArchitectureNode as NodeTypes[string],
  architectureGroup: ArchitectureGroupNode as NodeTypes[string],
  shape: ShapeNode as NodeTypes[string],
  text: TextNode as NodeTypes[string],
  sticky: StickyNoteNode as NodeTypes[string],
  comment: CommentNode as NodeTypes[string],
  image: ImageNode as NodeTypes[string],
  frame: FrameNode as NodeTypes[string],
};

/** Single-key tool shortcuts. Modifier combos are handled separately. */
const toolShortcuts: Record<string, CanvasTool> = {
  v: "select",
  h: "hand",
  r: "rectangle",
  o: "circle",
  d: "diamond",
  t: "text",
  a: "arrow",
  c: "connector",
  s: "stickyNote",
  i: "image",
  f: "frame",
  e: "eraser",
};

export function DiagramCanvas() {
  const { fitView, screenToFlowPosition } = useReactFlow();
  const fitViewRef = useRef(fitView);
  const didInitialFit = useRef(false);
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);
  const query = useDiagramStore((state) => state.query);
  const onNodesChange = useDiagramStore((state) => state.onNodesChange);
  const onEdgesChange = useDiagramStore((state) => state.onEdgesChange);
  const onConnect = useDiagramStore((state) => state.onConnect);
  const selectNode = useDiagramStore((state) => state.selectNode);
  const deleteSelected = useDiagramStore((state) => state.deleteSelected);
  const duplicateSelected = useDiagramStore((state) => state.duplicateSelected);
  const copySelected = useDiagramStore((state) => state.copySelected);
  const pasteCopied = useDiagramStore((state) => state.pasteCopied);
  const addArchitectureComponent = useDiagramStore((state) => state.addArchitectureComponent);
  const groupSelected = useDiagramStore((state) => state.groupSelected);
  const eraseNode = useDiagramStore((state) => state.eraseNode);
  const eraseEdge = useDiagramStore((state) => state.eraseEdge);
  const toolBeforePan = useRef<CanvasTool>("select");

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
    if (didInitialFit.current) return;
    didInitialFit.current = true;
    const fit = () => fitViewRef.current({ padding: 0.24 });
    const animationFrame = window.requestAnimationFrame(fit);
    const timeout = window.setTimeout(fit, 160);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const isTyping = (target: EventTarget | null) =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable);

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      const key = event.key.toLowerCase();

      // Modifier combos are clipboard/edit commands and must never also swap the
      // active tool, which is why they return instead of falling through.
      if (event.metaKey || event.ctrlKey) {
        if (key === "c") {
          event.preventDefault();
          copySelected();
        } else if (key === "v") {
          event.preventDefault();
          pasteCopied();
        } else if (key === "d") {
          event.preventDefault();
          duplicateSelected();
        } else if (key === "g") {
          event.preventDefault();
          groupSelected();
        }
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        if (!event.repeat) {
          setActiveTool((current) => {
            toolBeforePan.current = current;
            return "hand";
          });
        }
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
        return;
      }

      if (event.key === "Escape") {
        setActiveTool("select");
        return;
      }

      const shortcutTool = toolShortcuts[key];
      if (shortcutTool) setActiveTool(shortcutTool);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      // Space is a hold-to-pan gesture, so it restores whatever was active before.
      if (event.key === " ") {
        setActiveTool((current) => (current === "hand" ? toolBeforePan.current : current));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [copySelected, deleteSelected, duplicateSelected, groupSelected, pasteCopied]);

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      const inspectable = selectedNodes.find((node) => node.type !== "architectureGroup");
      selectNode(inspectable?.id);
    },
    [selectNode],
  );

  const handleToolChange = useCallback(
    (tool: CanvasTool) => {
      // Grouping is a one-shot command rather than a mode, so it never sticks.
      if (tool === "group") {
        groupSelected();
        return;
      }
      setActiveTool(tool);
    },
    [groupSelected],
  );

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const payload = event.dataTransfer.getData("application/system-design-component");
      if (!payload) return;

      try {
        const component = JSON.parse(payload);
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        addArchitectureComponent(component, {
          x: Math.round(position.x / 12) * 12,
          y: Math.round(position.y / 12) * 12,
        });
      } catch {
        // Ignore malformed drag payloads from outside the component library.
      }
    },
    [addArchitectureComponent, screenToFlowPosition],
  );

  const isErasing = activeTool === "eraser";
  const isDrawing = isDrawTool(activeTool);

  return (
    <section className="relative h-full min-h-0 overflow-hidden bg-ink-950">
      <CanvasToolbar showGrid={showGrid} onToggleGrid={() => setShowGrid((current) => !current)} />
      <EraserToolRail
        activeTool={activeTool}
        isLibraryOpen={isLibraryOpen}
        onToolChange={handleToolChange}
        onToggleLibrary={() => setIsLibraryOpen((current) => !current)}
      />
      {isLibraryOpen ? <ComponentLibraryPanel onClose={() => setIsLibraryOpen(false)} /> : null}
      {isDrawing ? (
        <DrawLayer activeTool={activeTool} onFinish={() => setActiveTool("select")} />
      ) : null}
      <ReactFlow
        nodes={visibleNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => {
          if (isErasing) {
            eraseNode(node.id);
            return;
          }
          selectNode(node.id);
        }}
        onEdgeClick={(_, edge) => {
          if (isErasing) eraseEdge(edge.id);
        }}
        onPaneClick={() => selectNode(undefined)}
        onSelectionChange={handleSelectionChange}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onInit={(instance) => {
          window.requestAnimationFrame(() => instance.fitView({ padding: 0.24 }));
          window.setTimeout(() => instance.fitView({ padding: 0.24 }), 180);
        }}
        defaultViewport={{ x: 220, y: 120, zoom: 0.72 }}
        minZoom={0.15}
        maxZoom={2.25}
        snapToGrid
        snapGrid={[12, 12]}
        selectionOnDrag={activeTool === "select"}
        panOnDrag={activeTool === "hand" ? true : [1, 2]}
        panOnScroll
        zoomOnScroll
        // Double-click is the inline text-editing gesture on drawable nodes.
        zoomOnDoubleClick={false}
        deleteKeyCode={null}
        // Shift-click to add to a selection, matching Figma/Eraser. Without this
        // React Flow only accepts Cmd/Ctrl, which collides with the shortcuts above.
        multiSelectionKeyCode={["Shift", "Meta", "Control"]}
        nodesDraggable={activeTool !== "hand" && !isErasing}
        nodesConnectable={activeTool === "connector" || activeTool === "arrow" || activeTool === "select"}
        elementsSelectable={activeTool !== "hand"}
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
        className={`architecture-canvas ${isErasing ? "canvas-erasing" : ""}`}
      >
        {showGrid ? (
          <Background
            variant={BackgroundVariant.Lines}
            gap={24}
            size={1}
            color="rgba(148, 163, 184, 0.14)"
          />
        ) : null}
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          nodeColor={(node) => (node.type === "architectureGroup" ? "#1f2937" : "#3b82f6")}
          maskColor="rgba(8, 10, 15, 0.68)"
          className="!bottom-5 !right-5 !h-28 !w-40 overflow-hidden !rounded-lg !border !border-white/10 !bg-ink-900/90 !shadow-panel"
        />
        <Controls
          position="bottom-left"
          className="!bottom-5 !left-5 overflow-hidden !rounded-lg !border !border-white/10 !bg-ink-900/90 !shadow-panel"
        />
      </ReactFlow>
    </section>
  );
}
