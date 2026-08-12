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
  const providerBadge = data.badge ?? data.provider;
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
        "group relative flex h-[96px] w-[124px] flex-col items-center justify-center rounded-md border border-white/10 bg-ink-900/90 p-2 text-center shadow-panel backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-white/20",
        selected && "border-accent-blue/70 shadow-glow",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border !border-white/30 !bg-ink-700"
      />
      {providerBadge ? (
        <span className="absolute left-1.5 top-1.5 max-w-[52px] truncate rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-slate-300">
          {providerBadge}
        </span>
      ) : null}
      <div className="flex flex-col items-center gap-2">
        <div
          className={clsx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ring-1",
            visual.className,
          )}
        >
          <Icon size={18} strokeWidth={1.85} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-center gap-1">
            {isEditing ? (
              <input
                autoFocus
                value={draftLabel}
                onChange={(event) => setDraftLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveLabel();
                  if (event.key === "Escape") setIsEditing(false);
                }}
                className="nodrag w-[92px] rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] font-medium text-white outline-none ring-accent-blue/40 focus:ring-2"
              />
            ) : (
              <p className="line-clamp-2 min-h-[28px] px-1 text-[11px] font-medium leading-4 text-white">
                {data.label}
              </p>
            )}
            <button
              type="button"
              aria-label={isEditing ? "Save label" : "Edit label"}
              title={isEditing ? "Save label" : "Edit label"}
              onClick={isEditing ? saveLabel : () => setIsEditing(true)}
              className="nodrag absolute right-1.5 top-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
            >
              {isEditing ? <Check size={14} /> : <Pencil size={13} />}
            </button>
          </div>
          <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500">
            {visual.label}
          </p>
        </div>
      </div>
      <div className="absolute bottom-1.5 right-1.5">
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium opacity-80 ${statusClassName}`}
        >
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
