import { useMemo, useState } from "react";
import { ArrowUp, BrainCircuit, ChevronRight, Library, Loader2, Search, Sparkles } from "lucide-react";
import { supportedModels, useDesignGeneration } from "./useDesignGeneration";
import { GenerationProgressBar } from "./GenerationProgressBar";
import { promptLibrary, type PromptDifficulty } from "../data/interviewPrompts";
import { useDiagramStore } from "../store/diagramStore";

const documentModes = [
  {
    id: "INTERVIEW" as const,
    label: "Interview",
    hint: "Requirements, estimation, deep dive, tradeoffs",
  },
  {
    id: "DELIVERY" as const,
    label: "Delivery",
    hint: "Adds security, testing, rollout and monitoring",
  },
];

const difficultyTone: Record<PromptDifficulty, string> = {
  Easy: "text-accent-green",
  Medium: "text-accent-blue",
  Hard: "text-rose-300",
};

export function AIPromptPanel() {
  const nodeCount = useDiagramStore(
    (state) => state.nodes.filter((node) => node.type === "architecture").length,
  );
  const edgeCount = useDiagramStore((state) => state.edges.length);
  const {
    prompt,
    setPrompt,
    model,
    setModel,
    isGenerating,
    lastMessage,
    progress,
    documentMode,
    setDocumentMode,
    runGeneration,
  } = useDesignGeneration();
  const [filter, setFilter] = useState("");
  const [openTiers, setOpenTiers] = useState<PromptDifficulty[]>(["Easy"]);

  const filteredGroups = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return promptLibrary;
    return promptLibrary
      .map((group) => ({
        ...group,
        prompts: group.prompts.filter((item) => item.toLowerCase().includes(needle)),
      }))
      .filter((group) => group.prompts.length > 0);
  }, [filter]);

  const matchCount = filteredGroups.reduce((total, group) => total + group.prompts.length, 0);

  const toggleTier = (difficulty: PromptDifficulty) =>
    setOpenTiers((current) =>
      current.includes(difficulty)
        ? current.filter((item) => item !== difficulty)
        : [...current, difficulty],
    );

  return (
    <aside className="hidden h-full w-[320px] shrink-0 flex-col border-r border-white/10 bg-ink-900/85 backdrop-blur xl:flex">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-blue/15 text-accent-blue ring-1 ring-accent-blue/30">
            <BrainCircuit size={18} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">System Design Studio</h1>
            <p className="text-xs text-slate-500">AI architecture workspace</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            <Sparkles size={14} />
            Generate
          </div>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Design Uber real-time driver tracking using WebSockets, Kafka, Redis GEO and Cassandra"
            className="h-32 w-full resize-none rounded-md border border-white/10 bg-black/20 p-3 text-sm leading-6 text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-accent-blue/60 focus:ring-2 focus:ring-accent-blue/20"
          />
          <div className="mt-3 flex rounded-md border border-white/10 bg-black/20 p-1">
            {documentModes.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setDocumentMode(option.id)}
                title={option.hint}
                className={`flex-1 rounded px-2 py-1.5 text-[11px] font-medium transition ${
                  documentMode === option.id
                    ? "bg-white text-ink-950"
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] leading-4 text-slate-600">
            {documentModes.find((option) => option.id === documentMode)?.hint}
          </p>

          <label className="mt-3 block text-xs font-medium text-slate-500" htmlFor="ai-model">
            Local model
          </label>
          <select
            id="ai-model"
            value={model}
            onChange={(event) => setModel(event.target.value as typeof model)}
            className="mt-1 h-9 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm text-slate-200 outline-none focus:border-accent-blue/60 focus:ring-2 focus:ring-accent-blue/20"
          >
            {supportedModels.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => runGeneration()}
            disabled={isGenerating}
            className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-white text-sm font-semibold text-ink-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? "Generating" : "Generate design"}
            {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={15} />}
          </button>
          {isGenerating ? (
            <GenerationProgressBar progress={progress} />
          ) : (
            <p className="mt-3 text-xs leading-5 text-slate-500">{lastMessage}</p>
          )}
        </div>

        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            <span className="flex items-center gap-2">
              <Library size={14} />
              Interview prompts
            </span>
            <span className="tabular-nums normal-case tracking-normal">{matchCount}</span>
          </div>

          <div className="relative">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter problems"
              aria-label="Filter interview prompts"
              className="h-8 w-full rounded-md border border-white/10 bg-black/20 pl-8 pr-2 text-xs text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-accent-blue/60"
            />
          </div>

          <div className="mt-3 space-y-3">
            {filteredGroups.map((group) => {
              // A filter that matches only one tier should not leave the others as noise.
              const isOpen = filter.trim() ? true : openTiers.includes(group.difficulty);

              return (
                <div key={group.difficulty}>
                  <button
                    type="button"
                    onClick={() => toggleTier(group.difficulty)}
                    className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition hover:bg-white/5"
                  >
                    <ChevronRight
                      size={13}
                      className={`shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
                    />
                    <span className={`text-xs font-semibold ${difficultyTone[group.difficulty]}`}>
                      {group.difficulty}
                    </span>
                    <span className="ml-auto text-[11px] tabular-nums text-slate-600">
                      {group.prompts.length}
                    </span>
                  </button>
                  <p className="mb-2 pl-6 text-[11px] leading-4 text-slate-600">{group.blurb}</p>

                  {isOpen && (
                    <div className="space-y-1.5">
                      {group.prompts.map((example) => (
                        <button
                          key={example}
                          type="button"
                          onClick={() => runGeneration(example)}
                          className="w-full rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-left text-[13px] leading-5 text-slate-300 transition hover:border-accent-blue/35 hover:bg-accent-blue/10 hover:text-white"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {matchCount === 0 && (
              <p className="px-1 text-xs text-slate-600">No problem matches that filter.</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-white/[0.035] p-2">
            <p className="text-sm font-semibold text-white">{nodeCount}</p>
            <p className="text-[11px] text-slate-500">Nodes</p>
          </div>
          <div className="rounded-md bg-white/[0.035] p-2">
            <p className="text-sm font-semibold text-white">{edgeCount}</p>
            <p className="text-[11px] text-slate-500">Edges</p>
          </div>
          <div className="rounded-md bg-white/[0.035] p-2">
            <p className="text-sm font-semibold text-white">HLD</p>
            <p className="text-[11px] text-slate-500">Mode</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
