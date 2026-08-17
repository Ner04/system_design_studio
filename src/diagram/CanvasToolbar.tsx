import {
  Download,
  Grid3X3,
  Maximize2,
  Minus,
  Plus,
  Redo2,
  Save,
  Search,
  Share2,
  Sparkles,
  Undo2,
} from "lucide-react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { useDiagramStore } from "../store/diagramStore";

type CanvasToolbarProps = {
  showGrid: boolean;
  onToggleGrid: () => void;
};

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function CanvasToolbar({ showGrid, onToggleGrid }: CanvasToolbarProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const viewport = useViewport();
  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);
  const query = useDiagramStore((state) => state.query);
  const setQuery = useDiagramStore((state) => state.setQuery);
  const undo = useDiagramStore((state) => state.undo);
  const redo = useDiagramStore((state) => state.redo);
  // Subscribing to the stack lengths rather than calling canUndo() keeps the buttons reactive.
  const canUndo = useDiagramStore((state) => state.past.length > 0);
  const canRedo = useDiagramStore((state) => state.future.length > 0);
  const zoomPercent = Math.round(viewport.zoom * 100);

  return (
    <div className="pointer-events-none absolute inset-x-4 top-4 z-20 flex flex-wrap items-start justify-between gap-3">
      <div className="pointer-events-auto flex min-w-[260px] max-w-[460px] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-ink-900/90 p-2 shadow-panel backdrop-blur">
        <Search size={15} className="ml-1 text-slate-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search architecture nodes"
          className="h-8 min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
        />
      </div>

      <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-white/10 bg-ink-900/90 p-1.5 shadow-panel backdrop-blur">
        <button
          type="button"
          title="Undo (Cmd+Z)"
          aria-label="Undo"
          onClick={undo}
          disabled={!canUndo}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-500"
        >
          <Undo2 size={15} />
        </button>
        <button
          type="button"
          title="Redo (Cmd+Shift+Z)"
          aria-label="Redo"
          onClick={redo}
          disabled={!canRedo}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-500"
        >
          <Redo2 size={15} />
        </button>

        <div className="mx-1 h-6 w-px bg-white/10" />

        <button
          type="button"
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() => zoomOut({ duration: 140 })}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <Minus size={15} />
        </button>
        <span className="min-w-12 text-center text-xs font-semibold tabular-nums text-slate-300">
          {zoomPercent}%
        </span>
        <button
          type="button"
          title="Zoom in"
          aria-label="Zoom in"
          onClick={() => zoomIn({ duration: 140 })}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <Plus size={15} />
        </button>
        <button
          type="button"
          title="Fit screen"
          aria-label="Fit screen"
          onClick={() => fitView({ padding: 0.22, duration: 220 })}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <Maximize2 size={15} />
        </button>
        <button
          type="button"
          title="Toggle grid"
          aria-label="Toggle grid"
          onClick={onToggleGrid}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
            showGrid
              ? "bg-white/10 text-white"
              : "text-slate-500 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Grid3X3 size={15} />
        </button>

        <div className="mx-1 h-6 w-px bg-white/10" />

        <button
          type="button"
          title="Share"
          aria-label="Share"
          className="hidden h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white md:flex"
        >
          <Share2 size={14} />
          Share
        </button>
        <button
          type="button"
          title="Export JSON"
          aria-label="Export JSON"
          onClick={() => downloadJson("system-design-studio-diagram.json", { nodes, edges })}
          className="hidden h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white md:flex"
        >
          <Download size={14} />
          Export
        </button>
        <button
          type="button"
          title="AI Generate"
          aria-label="AI Generate"
          className="hidden h-8 items-center gap-2 rounded-md bg-accent-blue px-3 text-xs font-semibold text-white shadow-glow transition hover:bg-blue-400 md:flex"
        >
          <Sparkles size={14} />
          AI
        </button>
        <button
          type="button"
          title="Save"
          aria-label="Save"
          className="flex h-8 items-center gap-2 rounded-md bg-white px-3 text-xs font-semibold text-ink-950 transition hover:bg-slate-200"
        >
          <Save size={14} />
          Save
        </button>
      </div>
    </div>
  );
}
