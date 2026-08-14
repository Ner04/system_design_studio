import {
  BookOpenText,
  Code2,
  Columns2,
  FileCode2,
  GitFork,
  Heading1,
  ListChecks,
  PanelRight,
  Table2,
} from "lucide-react";
import { MarkdownPreview } from "./MarkdownPreview";
import { useDocumentStore } from "../store/documentStore";

const panelModes = [
  { id: "write", label: "Write", icon: FileCode2 },
  { id: "split", label: "Split", icon: Columns2 },
  { id: "preview", label: "Preview", icon: PanelRight },
] as const;

const insertionSnippets = [
  {
    label: "Heading",
    icon: Heading1,
    value: "\n## New Section\n\n",
  },
  {
    label: "Checklist",
    icon: ListChecks,
    value: "\n- [ ] Validate requirements\n- [ ] Identify bottlenecks\n",
  },
  {
    label: "Code",
    icon: Code2,
    value: "\n```ts\ninterface ApiFlow {\n  source: string;\n  target: string;\n}\n```\n",
  },
  {
    label: "Table",
    icon: Table2,
    value: "\n| Concern | Strategy |\n| --- | --- |\n| Latency | Regional gateways |\n",
  },
] as const;

/**
 * `allowSplit` is false when the canvas is already sharing the screen: splitting the
 * document again would leave three columns competing for the same width.
 */
export function DocumentEditor({ allowSplit = true }: { allowSplit?: boolean }) {
  const title = useDocumentStore((state) => state.title);
  const markdown = useDocumentStore((state) => state.markdown);
  const storedPanelMode = useDocumentStore((state) => state.panelMode);
  const setTitle = useDocumentStore((state) => state.setTitle);
  const setMarkdown = useDocumentStore((state) => state.setMarkdown);
  const setPanelMode = useDocumentStore((state) => state.setPanelMode);

  const panelMode = !allowSplit && storedPanelMode === "split" ? "preview" : storedPanelMode;
  const visibleModes = allowSplit
    ? panelModes
    : panelModes.filter((mode) => mode.id !== "split");

  const appendSnippet = (snippet: string) => {
    setMarkdown(`${markdown}${snippet}`);
  };

  return (
    <section className="flex h-full min-h-0 flex-col bg-ink-950">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-ink-900/70 px-5 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] text-accent-green ring-1 ring-white/10">
            <BookOpenText size={18} />
          </div>
          <div className="min-w-0">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-label="Document title"
              className="w-full bg-transparent text-sm font-semibold text-white outline-none"
            />
            <p className="text-xs text-slate-500">Technical design document · Markdown</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-lg border border-white/10 bg-white/[0.035] p-1 lg:flex">
            {insertionSnippets.map((snippet) => {
              const Icon = snippet.icon;

              return (
                <button
                  key={snippet.label}
                  type="button"
                  aria-label={`Insert ${snippet.label}`}
                  title={`Insert ${snippet.label}`}
                  onClick={() => appendSnippet(snippet.value)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <Icon size={15} />
                </button>
              );
            })}
          </div>

          <div className="flex rounded-lg border border-white/10 bg-white/[0.035] p-1">
            {visibleModes.map((mode) => {
              const Icon = mode.icon;

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPanelMode(mode.id)}
                  className={`flex h-8 items-center gap-2 rounded-md px-3 text-xs font-medium transition ${
                    panelMode === mode.id
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
        </div>
      </div>

      {/* The toggle is authoritative at every width: only "split" shows both panes. */}
      <div
        className={`grid min-h-0 flex-1 overflow-hidden ${
          panelMode === "split"
            ? "grid-cols-1 xl:grid-cols-[minmax(360px,0.96fr)_minmax(320px,0.84fr)]"
            : "grid-cols-1"
        }`}
      >
        {panelMode !== "preview" && (
          <div className="min-h-0 border-r border-white/10">
            <textarea
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              aria-label="Markdown editor"
              spellCheck={false}
              className="h-full w-full resize-none bg-ink-950 px-8 py-7 font-mono text-[13px] leading-6 text-slate-200 outline-none placeholder:text-slate-600"
            />
          </div>
        )}

        {panelMode !== "write" && (
          <div className="min-h-0 bg-ink-900/35">
            <MarkdownPreview markdown={markdown} />
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-white/10 bg-ink-900/70 px-5 py-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <GitFork size={13} />
          <span>References live diagram components and generated architecture sections.</span>
        </div>
        <span>{markdown.split(/\s+/).filter(Boolean).length} words</span>
      </div>
    </section>
  );
}
