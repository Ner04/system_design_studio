import { Maximize2, Plus, Search } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { useDiagramStore } from "../store/diagramStore";
import { diagramNodeTypes, nodeVisuals } from "../utils/nodeStyle";

export function CanvasToolbar() {
  const { fitView } = useReactFlow();
  const addArchitectureNode = useDiagramStore((state) => state.addArchitectureNode);
  const query = useDiagramStore((state) => state.query);
  const setQuery = useDiagramStore((state) => state.setQuery);

  return (
    <div className="pointer-events-none absolute inset-x-4 top-4 z-20 flex items-start justify-between gap-3">
      <div className="pointer-events-auto flex min-w-[340px] max-w-[540px] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-ink-900/85 p-2 shadow-panel backdrop-blur">
        <Search size={16} className="ml-1 text-slate-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search architecture nodes"
          className="h-8 min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
        />
      </div>

      <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-white/10 bg-ink-900/85 p-2 shadow-panel backdrop-blur">
        <div className="flex items-center gap-1 border-r border-white/10 pr-2">
          {diagramNodeTypes.slice(0, 6).map((nodeType) => {
            const visual = nodeVisuals[nodeType];
            const Icon = visual.icon;

            return (
              <button
                key={nodeType}
                type="button"
                title={`Add ${visual.label}`}
                aria-label={`Add ${visual.label}`}
                onClick={() => addArchitectureNode(nodeType)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <Icon size={15} />
              </button>
            );
          })}
          <button
            type="button"
            title="Add service"
            aria-label="Add service"
            onClick={() => addArchitectureNode("service")}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          type="button"
          title="Fit view"
          aria-label="Fit view"
          onClick={() => fitView({ padding: 0.2 })}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <Maximize2 size={15} />
        </button>
      </div>
    </div>
  );
}
