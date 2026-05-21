import { ArrowUp, BrainCircuit, Library, Loader2, Sparkles } from "lucide-react";
import { examplePrompts, supportedModels, useDesignGeneration } from "./useDesignGeneration";
import { useDiagramStore } from "../store/diagramStore";

export function AIPromptPanel() {
  const nodeCount = useDiagramStore((state) => state.nodes.length);
  const edgeCount = useDiagramStore((state) => state.edges.length);
  const { prompt, setPrompt, model, setModel, isGenerating, lastMessage, runGeneration } =
    useDesignGeneration();

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
          <p className="mt-3 text-xs leading-5 text-slate-500">{lastMessage}</p>
        </div>

        <div className="mt-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            <Library size={14} />
            Interview prompts
          </div>
          <div className="space-y-2">
            {examplePrompts.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => runGeneration(example)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.025] p-3 text-left text-sm leading-5 text-slate-300 transition hover:border-accent-blue/35 hover:bg-accent-blue/10 hover:text-white"
              >
                {example}
              </button>
            ))}
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
