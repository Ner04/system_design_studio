import type { GenerationProgress } from "../types/ai";

/**
 * The document is written section by section, so the wait is made of discrete steps rather
 * than one opaque pause. Showing which step is running turns a two-minute spinner into
 * something the user can read progress from.
 */
export function GenerationProgressBar({
  progress,
  compact = false,
}: {
  progress?: GenerationProgress;
  compact?: boolean;
}) {
  // Before the first poll lands there is nothing truthful to show beyond "started".
  const total = progress?.total ?? 0;
  const completed = progress?.completed ?? 0;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={compact ? "mt-1.5" : "mt-3"}>
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
        <span className="truncate">
          {progress ? `Writing ${progress.currentStep}` : "Starting generation"}
        </span>
        {total > 0 && (
          <span className="shrink-0 tabular-nums text-slate-500">
            {completed}/{total}
          </span>
        )}
      </div>
      <div
        className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Design generation progress"
      >
        <div
          className={`h-full rounded-full bg-accent-blue transition-[width] duration-500 ease-out ${
            total === 0 ? "animate-pulse" : ""
          }`}
          // An indeterminate sliver still reads as "working" before the first poll returns.
          style={{ width: total > 0 ? `${Math.max(percent, 4)}%` : "12%" }}
        />
      </div>
    </div>
  );
}
