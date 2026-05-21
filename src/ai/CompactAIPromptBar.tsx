import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { examplePrompts, supportedModels, useDesignGeneration } from "./useDesignGeneration";

export function CompactAIPromptBar() {
  const { prompt, setPrompt, model, setModel, isGenerating, lastMessage, runGeneration } =
    useDesignGeneration();

  return (
    <div className="border-b border-white/10 bg-ink-900/80 px-3 py-3 backdrop-blur xl:hidden">
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2">
        <Sparkles size={15} className="shrink-0 text-accent-blue" />
        <select
          value={model}
          onChange={(event) => setModel(event.target.value as typeof model)}
          aria-label="AI model"
          className="h-8 rounded-md border border-white/10 bg-ink-850 px-2 text-xs text-slate-300 outline-none"
        >
          {supportedModels.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          aria-label="Architecture prompt"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none"
        />
        <button
          type="button"
          onClick={() => runGeneration()}
          disabled={isGenerating}
          aria-label="Generate design"
          title="Generate design"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-ink-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={15} />}
        </button>
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {examplePrompts.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => runGeneration(example)}
            className="shrink-0 rounded-md border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs text-slate-300 transition hover:border-accent-blue/35 hover:bg-accent-blue/10 hover:text-white"
          >
            {example.replace("Design ", "")}
          </button>
        ))}
      </div>
      <p className="mt-1 truncate text-xs text-slate-500">{lastMessage}</p>
    </div>
  );
}
