import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useReactFlow } from "@xyflow/react";
import { useDiagramStore, type DrawRect } from "../store/diagramStore";
import { clickSizes, shapeKinds } from "./drawTools";
import type { CanvasTool } from "./EraserToolRail";

const GRID = 12;
const CLICK_THRESHOLD = 8;

type ScreenRect = { left: number; top: number; width: number; height: number };

function snap(value: number) {
  return Math.round(value / GRID) * GRID;
}

type DrawLayerProps = {
  activeTool: CanvasTool;
  onFinish: () => void;
};

export function DrawLayer({ activeTool, onFinish }: DrawLayerProps) {
  const { screenToFlowPosition } = useReactFlow();
  const [preview, setPreview] = useState<ScreenRect | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const pendingImageRect = useRef<DrawRect | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addShapeNode = useDiagramStore((state) => state.addShapeNode);
  const addTextNode = useDiagramStore((state) => state.addTextNode);
  const addStickyNode = useDiagramStore((state) => state.addStickyNode);
  const addCommentNode = useDiagramStore((state) => state.addCommentNode);
  const addImageNode = useDiagramStore((state) => state.addImageNode);
  const addFrameNode = useDiagramStore((state) => state.addFrameNode);

  const toFlowRect = (start: { x: number; y: number }, end: { x: number; y: number }): DrawRect => {
    const isClick =
      Math.abs(end.x - start.x) < CLICK_THRESHOLD && Math.abs(end.y - start.y) < CLICK_THRESHOLD;
    const origin = screenToFlowPosition({
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
    });

    if (isClick) {
      const size = clickSizes[activeTool] ?? { width: 180, height: 108 };
      return { x: snap(origin.x), y: snap(origin.y), ...size };
    }

    const far = screenToFlowPosition({
      x: Math.max(start.x, end.x),
      y: Math.max(start.y, end.y),
    });

    return {
      x: snap(origin.x),
      y: snap(origin.y),
      width: Math.max(GRID * 2, snap(far.x - origin.x)),
      height: Math.max(GRID * 2, snap(far.y - origin.y)),
    };
  };

  const commit = (rect: DrawRect) => {
    const shapeKind = shapeKinds[activeTool];
    if (shapeKind) {
      addShapeNode(shapeKind, rect);
    } else if (activeTool === "frame") {
      addFrameNode(rect);
    } else if (activeTool === "text") {
      addTextNode(rect);
    } else if (activeTool === "stickyNote") {
      addStickyNode(rect);
    } else if (activeTool === "comment") {
      addCommentNode(rect);
    } else if (activeTool === "image") {
      // The node cannot be created until a file is chosen, so park the rect and
      // let the file input's change handler finish the job.
      pendingImageRect.current = rect;
      fileInputRef.current?.click();
      return;
    }

    onFinish();
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    startRef.current = { x: event.clientX, y: event.clientY };
    const bounds = event.currentTarget.getBoundingClientRect();
    setPreview({
      left: event.clientX - bounds.left,
      top: event.clientY - bounds.top,
      width: 0,
      height: 0,
    });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = startRef.current;
    if (!start) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setPreview({
      left: Math.min(start.x, event.clientX) - bounds.left,
      top: Math.min(start.y, event.clientY) - bounds.top,
      width: Math.abs(event.clientX - start.x),
      height: Math.abs(event.clientY - start.y),
    });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = startRef.current;
    startRef.current = null;
    setPreview(null);
    if (!start) return;
    commit(toFlowRect(start, { x: event.clientX, y: event.clientY }));
  };

  const handleFileChange = (file: File | undefined) => {
    const rect = pendingImageRect.current;
    pendingImageRect.current = null;
    if (!file || !rect) {
      onFinish();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      // Match the node box to the image's aspect ratio, leaving room for the caption.
      const probe = new Image();
      probe.onload = () => {
        const ratio = probe.naturalHeight / probe.naturalWidth || 0.66;
        addImageNode(src, file.name, {
          ...rect,
          height: Math.round(rect.width * ratio) + 24,
        });
        onFinish();
      };
      probe.onerror = () => {
        addImageNode(src, file.name, rect);
        onFinish();
      };
      probe.src = src;
    };
    reader.onerror = () => onFinish();
    reader.readAsDataURL(file);
  };

  const isCircle = activeTool === "circle";

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          handleFileChange(file);
        }}
      />
      <div
        role="presentation"
        aria-label={`Draw ${activeTool}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          startRef.current = null;
          setPreview(null);
        }}
        className="absolute inset-0 z-10 cursor-crosshair"
      >
        {preview ? (
          <div
            style={{
              left: preview.left,
              top: preview.top,
              width: preview.width,
              height: preview.height,
            }}
            className={`pointer-events-none absolute border-2 border-dashed border-accent-blue/80 bg-accent-blue/10 ${
              isCircle ? "rounded-full" : "rounded"
            }`}
          />
        ) : null}
      </div>
    </>
  );
}
