import {
  Check,
  Download,
  Grid3X3,
  Maximize2,
  Minus,
  Plus,
  Redo2,
  Save,
  Search,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { useDiagramStore } from "../store/diagramStore";
import { useDocumentStore } from "../store/documentStore";
import { saveDesign } from "../services/persistenceService";

type CanvasToolbarProps = {
  showGrid: boolean;
  onToggleGrid: () => void;
};

function triggerDownload(filename: string, href: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  triggerDownload(filename, url);
  URL.revokeObjectURL(url);
}

/**
 * Rasterises the canvas by inlining it into an SVG foreignObject and painting that to a canvas.
 * It avoids a screenshot dependency, at the cost of needing the background painted explicitly -
 * a transparent PNG on a dark diagram is unreadable wherever it gets pasted.
 */
async function downloadPng(filename: string, scale = 2) {
  const viewportEl = document.querySelector<HTMLElement>(".react-flow__viewport");
  const paneEl = document.querySelector<HTMLElement>(".react-flow");
  if (!viewportEl || !paneEl) throw new Error("Canvas not ready");

  const bounds = paneEl.getBoundingClientRect();
  const width = Math.ceil(bounds.width);
  const height = Math.ceil(bounds.height);

  const clone = viewportEl.cloneNode(true) as HTMLElement;
  const styles = Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText);
      } catch {
        // Cross-origin stylesheets cannot be read; the app's own styles are local.
        return [];
      }
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden">
          <style>${styles}</style>${clone.outerHTML}
        </div>
      </foreignObject>
    </svg>`;

  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("Could not rasterise the canvas"));
  });

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D unavailable");
  context.fillStyle = "#080a0f";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.scale(scale, scale);
  context.drawImage(image, 0, 0);

  triggerDownload(filename, canvas.toDataURL("image/png"));
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
  const title = useDocumentStore((state) => state.title);
  const markdown = useDocumentStore((state) => state.markdown);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const zoomPercent = Math.round(viewport.zoom * 100);

  const handleSave = async () => {
    setSaveState("saving");
    try {
      await saveDesign(title, { nodes, edges }, markdown);
      setSaveState("saved");
      // Returning to idle keeps the button honest about what a further click would do.
      window.setTimeout(() => setSaveState("idle"), 2400);
    } catch {
      setSaveState("failed");
      window.setTimeout(() => setSaveState("idle"), 3200);
    }
  };

  const saveLabel = { idle: "Save", saving: "Saving", saved: "Saved", failed: "Retry" }[saveState];

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
          title="Export PNG (Alt-click for JSON)"
          aria-label="Export PNG"
          onClick={(event) => {
            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
            if (event.altKey) {
              downloadJson(`${slug || "diagram"}.json`, { nodes, edges });
              return;
            }
            void downloadPng(`${slug || "diagram"}.png`).catch(() =>
              downloadJson(`${slug || "diagram"}.json`, { nodes, edges }),
            );
          }}
          className="hidden h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white md:flex"
        >
          <Download size={14} />
          Export
        </button>
        <button
          type="button"
          title="Save diagram and document"
          aria-label="Save"
          onClick={handleSave}
          disabled={saveState === "saving"}
          className={`flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold transition disabled:cursor-not-allowed ${
            saveState === "failed"
              ? "bg-rose-500/90 text-white hover:bg-rose-500"
              : saveState === "saved"
                ? "bg-accent-green text-ink-950"
                : "bg-white text-ink-950 hover:bg-slate-200"
          }`}
        >
          {saveState === "saved" ? <Check size={14} /> : <Save size={14} />}
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
