import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import clsx from "clsx";
import { Boxes } from "lucide-react";
import type { ArchitectureGroupNode as ArchitectureGroupFlowNode } from "../types/diagram";

const toneClasses = {
  amber: "border-amber-400/60 bg-amber-500/[0.18] text-amber-100 shadow-amber-950/30",
  blue: "border-sky-400/60 bg-sky-500/[0.16] text-sky-100 shadow-sky-950/30",
  violet: "border-violet-400/60 bg-violet-500/[0.16] text-violet-100 shadow-violet-950/30",
  green: "border-emerald-400/60 bg-emerald-500/[0.16] text-emerald-100 shadow-emerald-950/30",
  red: "border-red-400/60 bg-red-500/[0.16] text-red-100 shadow-red-950/30",
  pink: "border-pink-400/60 bg-pink-500/[0.16] text-pink-100 shadow-pink-950/30",
};

export const ArchitectureGroupNode = memo(function ArchitectureGroupNode({
  data,
}: NodeProps<ArchitectureGroupFlowNode>) {
  return (
    <section
      className={clsx(
        "h-full w-full rounded-lg border p-3 shadow-2xl backdrop-blur-sm",
        toneClasses[data.tone],
      )}
    >
      <div className="flex items-center gap-2 text-[12px] font-semibold">
        <Boxes size={13} strokeWidth={1.8} />
        <span>{data.label}</span>
      </div>
      {data.caption ? (
        <p className="mt-1 max-w-[34ch] text-[10px] leading-4 opacity-70">{data.caption}</p>
      ) : null}
    </section>
  );
});
