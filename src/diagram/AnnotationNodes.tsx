import { memo } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import clsx from "clsx";
import { MessageSquare } from "lucide-react";
import { InlineText } from "./InlineText";
import { annotationTones, shapeRadiusClasses } from "./annotationStyle";
import type {
  CommentFlowNode,
  FrameFlowNode,
  ImageFlowNode,
  ShapeFlowNode,
  StickyNoteFlowNode,
  TextFlowNode,
} from "../types/diagram";

const resizerLineClassName = "!border-accent-blue/70";
const resizerHandleClassName = "!h-2 !w-2 !rounded-[2px] !border !border-white/80 !bg-accent-blue";

const handleClassName = "!h-2.5 !w-2.5 !border !border-white/30 !bg-ink-700";

export const ShapeNode = memo(function ShapeNode({
  id,
  data,
  selected,
}: NodeProps<ShapeFlowNode>) {
  const tone = annotationTones[data.tone];
  const isDiamond = data.kind === "diamond";

  return (
    <div className="relative h-full w-full">
      <NodeResizer
        isVisible={selected}
        minWidth={64}
        minHeight={48}
        keepAspectRatio={data.kind === "circle" || isDiamond}
        lineClassName={resizerLineClassName}
        handleClassName={resizerHandleClassName}
      />
      <Handle type="target" position={Position.Left} className={handleClassName} />

      {isDiamond ? (
        <div
          className={clsx(
            "absolute inset-[14.6%] rotate-45 border shadow-panel backdrop-blur-sm transition",
            shapeRadiusClasses.diamond,
            tone.surface,
            selected && "ring-2 ring-accent-blue/60",
          )}
        />
      ) : null}

      <div
        className={clsx(
          "flex h-full w-full items-center justify-center p-3 transition",
          !isDiamond && "border shadow-panel backdrop-blur-sm",
          !isDiamond && shapeRadiusClasses[data.kind],
          !isDiamond && tone.surface,
          !isDiamond && selected && "ring-2 ring-accent-blue/60",
        )}
      >
        <InlineText
          nodeId={id}
          value={data.text}
          placeholder="Label"
          className={clsx(
            "flex items-center justify-center text-center text-[12px] font-semibold leading-4",
            isDiamond && "relative z-10 px-[18%]",
          )}
        />
      </div>

      <Handle type="source" position={Position.Right} className={handleClassName} />
    </div>
  );
});

export const TextNode = memo(function TextNode({ id, data, selected }: NodeProps<TextFlowNode>) {
  return (
    <div className="relative h-full w-full">
      <NodeResizer
        isVisible={selected}
        minWidth={80}
        minHeight={28}
        lineClassName={resizerLineClassName}
        handleClassName={resizerHandleClassName}
      />
      <div
        className={clsx(
          "flex h-full w-full items-center rounded px-1 py-0.5 transition",
          selected ? "ring-1 ring-accent-blue/60" : "ring-1 ring-transparent",
        )}
      >
        <InlineText
          nodeId={id}
          value={data.text}
          placeholder="Type something"
          className="text-left text-[15px] font-semibold leading-5 text-slate-100"
        />
      </div>
    </div>
  );
});

export const StickyNoteNode = memo(function StickyNoteNode({
  id,
  data,
  selected,
}: NodeProps<StickyNoteFlowNode>) {
  const tone = annotationTones[data.tone];

  return (
    <div className="relative h-full w-full">
      <NodeResizer
        isVisible={selected}
        minWidth={96}
        minHeight={96}
        lineClassName={resizerLineClassName}
        handleClassName={resizerHandleClassName}
      />
      <div
        className={clsx(
          "h-full w-full rounded-sm border p-3 shadow-panel transition",
          tone.paper,
          selected && "ring-2 ring-accent-blue/60",
        )}
      >
        <InlineText
          nodeId={id}
          value={data.text}
          placeholder="Note"
          className="text-left text-[12px] font-medium leading-5"
        />
      </div>
    </div>
  );
});

export const CommentNode = memo(function CommentNode({
  id,
  data,
  selected,
}: NodeProps<CommentFlowNode>) {
  return (
    <div className="relative h-full w-full">
      <NodeResizer
        isVisible={selected}
        minWidth={140}
        minHeight={72}
        lineClassName={resizerLineClassName}
        handleClassName={resizerHandleClassName}
      />
      <div
        className={clsx(
          "flex h-full w-full flex-col rounded-lg border border-white/12 bg-ink-900/95 p-2.5 shadow-panel backdrop-blur transition",
          selected && "ring-2 ring-accent-blue/60",
        )}
      >
        <div className="mb-1.5 flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <MessageSquare size={11} />
          {data.author}
        </div>
        <div className="min-h-0 flex-1">
          <InlineText
            nodeId={id}
            value={data.text}
            placeholder="Leave a comment"
            className="text-left text-[12px] leading-5 text-slate-200"
          />
        </div>
      </div>
    </div>
  );
});

export const ImageNode = memo(function ImageNode({ id, data, selected }: NodeProps<ImageFlowNode>) {
  return (
    <div className="relative h-full w-full">
      <NodeResizer
        isVisible={selected}
        minWidth={80}
        minHeight={60}
        lineClassName={resizerLineClassName}
        handleClassName={resizerHandleClassName}
      />
      <Handle type="target" position={Position.Left} className={handleClassName} />
      <figure
        className={clsx(
          "flex h-full w-full flex-col overflow-hidden rounded-md border border-white/12 bg-ink-900/80 shadow-panel transition",
          selected && "ring-2 ring-accent-blue/60",
        )}
      >
        <img
          src={data.src}
          alt={data.text}
          draggable={false}
          className="min-h-0 w-full flex-1 object-contain"
        />
        <figcaption className="h-6 shrink-0 border-t border-white/10 px-2">
          <InlineText
            nodeId={id}
            value={data.text}
            placeholder="Caption"
            singleLine
            className="text-center text-[10px] leading-6 text-slate-400"
          />
        </figcaption>
      </figure>
      <Handle type="source" position={Position.Right} className={handleClassName} />
    </div>
  );
});

export const FrameNode = memo(function FrameNode({ id, data, selected }: NodeProps<FrameFlowNode>) {
  return (
    <div className="relative h-full w-full">
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        minHeight={120}
        lineClassName={resizerLineClassName}
        handleClassName={resizerHandleClassName}
      />
      <div
        className={clsx(
          "h-full w-full rounded-lg border border-dashed border-white/25 bg-white/[0.02] transition",
          selected && "border-accent-blue/60 bg-accent-blue/[0.04]",
        )}
      >
        <div className="h-7 px-3">
          <InlineText
            nodeId={id}
            value={data.text}
            placeholder="Frame"
            singleLine
            className="text-left text-[11px] font-semibold uppercase leading-7 tracking-[0.14em] text-slate-400"
          />
        </div>
      </div>
    </div>
  );
});
