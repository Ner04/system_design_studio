import { memo, useEffect, useMemo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import clsx from "clsx";
import { Check, Pencil } from "lucide-react";
import { useDiagramStore } from "../store/diagramStore";
import type { ArchitectureFlowNode } from "../types/diagram";
import { fallbackNodeVisual, nodeVisuals } from "../utils/nodeStyle";

export const ArchitectureNode = memo(function ArchitectureNode({
  id,
  data,
  selected,
}: NodeProps<ArchitectureFlowNode>) {
  const updateNodeLabel = useDiagramStore((state) => state.updateNodeLabel);
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data.label);
  const visual = nodeVisuals[data.nodeType] ?? fallbackNodeVisual;
  const Icon = visual.icon;
  const status = data.status ?? "healthy";
  const statusClassName = useMemo(
    () =>
      ({
        healthy: "bg-emerald-400/10 text-emerald-200",
        warning: "bg-amber-400/10 text-amber-200",
        critical: "bg-rose-400/10 text-rose-200",
      })[status],
    [status],
  );

  useEffect(() => {
    if (!isEditing) {
      setDraftLabel(data.label);
    }
  }, [data.label, isEditing]);

  const saveLabel = () => {
    updateNodeLabel(id, draftLabel.trim() || data.label);
    setIsEditing(false);
  };

  return (
    <div
      className={clsx(
        "group w-[230px] rounded-lg border border-white/10 bg-ink-850/95 p-3 shadow-panel backdrop-blur transition duration-200",
        selected && "border-accent-blue/70 shadow-glow",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border !border-white/30 !bg-ink-700"
      />
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ring-1",
            visual.className,
          )}
        >
          <Icon size={19} strokeWidth={1.9} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <input
                autoFocus
                value={draftLabel}
                onChange={(event) => setDraftLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveLabel();
                  if (event.key === "Escape") setIsEditing(false);
                }}
                className="nodrag w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm font-medium text-white outline-none ring-accent-blue/40 focus:ring-2"
              />
            ) : (
              <p className="truncate text-sm font-semibold text-white">{data.label}</p>
            )}
            <button
              type="button"
              aria-label={isEditing ? "Save label" : "Edit label"}
              title={isEditing ? "Save label" : "Edit label"}
              onClick={isEditing ? saveLabel : () => setIsEditing(true)}
              className="nodrag flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
            >
              {isEditing ? <Check size={14} /> : <Pencil size={13} />}
            </button>
          </div>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
            {visual.label}
          </p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400">
        {data.description}
      </p>
      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
        <span className="text-[11px] text-slate-500">p95 latency</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClassName}`}>
          {status}
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border !border-white/30 !bg-accent-blue"
      />
    </div>
  );
});
