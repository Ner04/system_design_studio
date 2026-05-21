import { Database, GitPullRequestArrow, ShieldCheck, TrendingUp } from "lucide-react";
import { useDiagramStore } from "../store/diagramStore";

export function InspectorPanel() {
  const selectedNodeId = useDiagramStore((state) => state.selectedNodeId);
  const selectedNode = useDiagramStore((state) =>
    state.nodes.find((node) => node.id === selectedNodeId),
  );

  return (
    <aside className="hidden h-full w-[320px] shrink-0 flex-col border-l border-white/10 bg-ink-900/80 backdrop-blur 2xl:flex">
      <div className="border-b border-white/10 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Inspector
        </p>
        <h2 className="mt-2 text-lg font-semibold text-white">
          {selectedNode?.data.label ?? "No component selected"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {selectedNode?.data.description ??
            "Select a node to inspect component behavior, ownership, bottlenecks, and scaling notes."}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {[
            {
              icon: TrendingUp,
              title: "Scaling notes",
              body: "Shard hot paths by geography and isolate realtime fanout from durable writes.",
            },
            {
              icon: GitPullRequestArrow,
              title: "Data flow",
              body: "Location events move from clients through gateways into stream processing.",
            },
            {
              icon: Database,
              title: "Persistence",
              body: "Use cache for active positions and wide-column storage for append-heavy history.",
            },
            {
              icon: ShieldCheck,
              title: "Reliability",
              body: "Backpressure, rate limits, and replayable logs protect downstream systems.",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Icon size={15} className="text-accent-green" />
                  {item.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
