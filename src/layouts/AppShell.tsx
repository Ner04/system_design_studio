import { FileText, GitFork, Rows3 } from "lucide-react";
import { AIPromptPanel } from "../ai/AIPromptPanel";
import { CompactAIPromptBar } from "../ai/CompactAIPromptBar";
import { InspectorPanel } from "../components/InspectorPanel";
import { DiagramCanvas } from "../diagram/DiagramCanvas";
import { DocumentEditor } from "../document/DocumentEditor";
import { useDiagramStore } from "../store/diagramStore";
import { useDocumentStore } from "../store/documentStore";

const modes = [
  { id: "document", label: "Doc", icon: FileText },
  { id: "canvas", label: "Canvas", icon: GitFork },
  { id: "both", label: "Both", icon: Rows3 },
] as const;

export function AppShell() {
  const viewMode = useDiagramStore((state) => state.viewMode);
  const setViewMode = useDiagramStore((state) => state.setViewMode);
  const documentTitle = useDocumentStore((state) => state.title);

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-ink-950 text-slate-100">
      <AIPromptPanel />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-ink-900/80 px-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div>
              <p className="max-w-[34vw] truncate text-sm font-semibold text-white">
                {documentTitle}
              </p>
              <p className="text-xs text-slate-500">Draft architecture · autosave ready</p>
            </div>
          </div>

          <div className="flex rounded-lg border border-white/10 bg-white/[0.035] p-1">
            {modes.map((mode) => {
              const Icon = mode.icon;
              const isActive = viewMode === mode.id;

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setViewMode(mode.id)}
                  className={`flex h-8 items-center gap-2 rounded-md px-3 text-xs font-medium transition ${
                    isActive
                      ? "bg-white text-ink-950"
                      : "text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={14} />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </header>
        <CompactAIPromptBar />

        <div className="min-h-0 flex-1">
          {viewMode === "canvas" && <DiagramCanvas />}
          {viewMode === "document" && <DocumentEditor />}
          {viewMode === "both" && (
            <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(240px,0.95fr)_6px_minmax(280px,1.05fr)] bg-ink-950 lg:grid-cols-[minmax(420px,0.95fr)_6px_minmax(460px,1.05fr)] lg:grid-rows-1">
              <div className="min-h-0">
                <DocumentEditor allowSplit={false} />
              </div>
              <div
                aria-hidden="true"
                className="cursor-row-resize border-y border-white/10 bg-white/[0.035] lg:cursor-col-resize lg:border-x lg:border-y-0"
              />
              <div className="min-h-0">
                <DiagramCanvas />
              </div>
            </div>
          )}
        </div>
      </div>
      {viewMode !== "document" && <InspectorPanel />}
    </main>
  );
}
