import { AlignCenter, AlignLeft, AlignRight, BringToFront, Lock, SendToBack, SlidersHorizontal, Trash2 } from "lucide-react";
import { useDiagramStore } from "../store/diagramStore";
import { annotationLabels, annotationToneKeys, annotationTones } from "../diagram/annotationStyle";
import { isAnnotationNode, type AnnotationTone } from "../types/diagram";
import { fallbackNodeVisual, nodeVisuals } from "../utils/nodeStyle";

function FieldLabel({ children }: { children: string }) {
  return <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{children}</label>;
}

export function InspectorPanel() {
  const selectedNodeId = useDiagramStore((state) => state.selectedNodeId);
  const updateNodeLabel = useDiagramStore((state) => state.updateNodeLabel);
  const updateNodeText = useDiagramStore((state) => state.updateNodeText);
  const updateNodeTone = useDiagramStore((state) => state.updateNodeTone);
  const eraseNode = useDiagramStore((state) => state.eraseNode);
  const selectedNode = useDiagramStore((state) =>
    state.nodes.find((node) => node.id === selectedNodeId),
  );

  const architectureNode = selectedNode?.type === "architecture" ? selectedNode : undefined;
  const annotationNode = selectedNode && isAnnotationNode(selectedNode) ? selectedNode : undefined;
  const toneable =
    annotationNode?.type === "shape" || annotationNode?.type === "sticky"
      ? annotationNode
      : undefined;

  const visual = architectureNode
    ? nodeVisuals[architectureNode.data.nodeType] ?? fallbackNodeVisual
    : fallbackNodeVisual;
  const Icon = visual.icon;
  // `measured` reflects what is actually on screen after a resize; `style` only
  // holds the size the node was created with.
  const width = Math.round(
    Number(selectedNode?.measured?.width ?? selectedNode?.width ?? selectedNode?.style?.width ?? 124),
  );
  const height = Math.round(
    Number(selectedNode?.measured?.height ?? selectedNode?.height ?? selectedNode?.style?.height ?? 96),
  );

  return (
    <aside className="hidden h-full w-[340px] shrink-0 flex-col border-l border-white/10 bg-ink-900/90 backdrop-blur xl:flex">
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        <div>
          <p className="text-sm font-semibold text-white">Properties</p>
          <p className="text-xs text-slate-500">
            {annotationNode
              ? annotationLabels[annotationNode.type]
              : selectedNode
                ? "Selected component"
                : "Nothing selected"}
          </p>
        </div>
        <SlidersHorizontal size={17} className="text-slate-500" />
      </div>

      {architectureNode ? (
        <div className="flex-1 overflow-y-auto">
          <section className="border-b border-white/10 p-4">
            <FieldLabel>General</FieldLabel>
            <div className="mt-3 flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ring-1 ${visual.className}`}>
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <input
                  value={architectureNode.data.label}
                  onChange={(event) => updateNodeLabel(architectureNode.id, event.target.value)}
                  className="h-9 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm font-semibold text-white outline-none ring-accent-blue/40 transition focus:ring-2"
                />
                <p className="mt-1 truncate text-xs text-slate-500">
                  {architectureNode.data.provider ?? visual.label}
                  {architectureNode.data.badge ? ` · ${architectureNode.data.badge}` : ""}
                </p>
              </div>
            </div>
            <textarea
              value={architectureNode.data.description ?? ""}
              readOnly
              rows={4}
              className="mt-3 w-full resize-none rounded-md border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-400 outline-none"
            />
          </section>

          <section className="space-y-3 border-b border-white/10 p-4">
            <FieldLabel>Appearance</FieldLabel>
            <div className="grid grid-cols-[88px_1fr] items-center gap-3 text-xs">
              <span className="text-slate-500">Fill</span>
              <div className="flex items-center gap-2">
                <span className="h-7 w-9 rounded border border-white/10 bg-ink-800" />
                <input readOnly value="rgba(12,16,24,0.90)" className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-2 text-slate-400 outline-none" />
              </div>
              <span className="text-slate-500">Stroke</span>
              <div className="flex items-center gap-2">
                <span className="h-7 w-9 rounded border border-white/10 bg-accent-blue/60" />
                <input readOnly value={architectureNode.selected ? "#5AA7FF" : "rgba(255,255,255,0.10)"} className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-2 text-slate-400 outline-none" />
              </div>
              <span className="text-slate-500">Opacity</span>
              <input readOnly value="100%" className="h-8 rounded-md border border-white/10 bg-black/20 px-2 text-slate-400 outline-none" />
              <span className="text-slate-500">Radius</span>
              <input readOnly value="6 px" className="h-8 rounded-md border border-white/10 bg-black/20 px-2 text-slate-400 outline-none" />
            </div>
          </section>

          <section className="space-y-3 border-b border-white/10 p-4">
            <FieldLabel>Position & Size</FieldLabel>
            <div className="grid grid-cols-4 gap-2">
              {[
                ["X", Math.round(architectureNode.position.x)],
                ["Y", Math.round(architectureNode.position.y)],
                ["W", width],
                ["H", height],
              ].map(([label, value]) => (
                <label key={label} className="text-xs text-slate-500">
                  {label}
                  <input
                    readOnly
                    value={value}
                    className="mt-1 h-8 w-full rounded-md border border-white/10 bg-black/20 px-2 text-slate-300 outline-none"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3 border-b border-white/10 p-4">
            <FieldLabel>Text</FieldLabel>
            <div className="grid grid-cols-[88px_1fr] items-center gap-3 text-xs">
              <span className="text-slate-500">Font</span>
              <input readOnly value="Inter" className="h-8 rounded-md border border-white/10 bg-black/20 px-2 text-slate-300 outline-none" />
              <span className="text-slate-500">Size</span>
              <input readOnly value="11" className="h-8 rounded-md border border-white/10 bg-black/20 px-2 text-slate-300 outline-none" />
              <span className="text-slate-500">Align</span>
              <div className="flex overflow-hidden rounded-md border border-white/10">
                {[AlignLeft, AlignCenter, AlignRight].map((AlignIcon, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`flex h-8 flex-1 items-center justify-center transition ${
                      index === 1 ? "bg-white/10 text-white" : "text-slate-500 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <AlignIcon size={14} />
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-3 p-4">
            <FieldLabel>Layer</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Bring Forward", icon: BringToFront },
                { label: "Send Back", icon: SendToBack },
                { label: "Lock", icon: Lock },
              ].map((action) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    className="flex h-9 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.035] text-xs font-semibold text-slate-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                  >
                    <ActionIcon size={14} />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : annotationNode ? (
        <div className="flex-1 overflow-y-auto">
          <section className="border-b border-white/10 p-4">
            <FieldLabel>Content</FieldLabel>
            <textarea
              value={String(annotationNode.data.text ?? "")}
              onChange={(event) => updateNodeText(annotationNode.id, event.target.value)}
              rows={4}
              placeholder={`${annotationLabels[annotationNode.type]} text`}
              className="mt-3 w-full resize-none rounded-md border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-200 outline-none ring-accent-blue/40 transition placeholder:text-slate-600 focus:ring-2"
            />
            <p className="mt-2 text-[11px] text-slate-500">
              Double-click the object on the canvas to edit it in place.
            </p>
          </section>

          {toneable ? (
            <section className="border-b border-white/10 p-4">
              <FieldLabel>Color</FieldLabel>
              <div className="mt-3 flex flex-wrap gap-2">
                {annotationToneKeys.map((tone) => {
                  const isActive = toneable.data.tone === tone;

                  return (
                    <button
                      key={tone}
                      type="button"
                      title={annotationTones[tone].label}
                      aria-label={annotationTones[tone].label}
                      aria-pressed={isActive}
                      onClick={() => updateNodeTone(toneable.id, tone as AnnotationTone)}
                      className={`h-7 w-7 rounded-md border transition ${annotationTones[tone].swatch} ${
                        isActive
                          ? "border-white ring-2 ring-accent-blue/60"
                          : "border-white/20 hover:border-white/60"
                      }`}
                    />
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="space-y-3 border-b border-white/10 p-4">
            <FieldLabel>Position & Size</FieldLabel>
            <div className="grid grid-cols-4 gap-2">
              {[
                ["X", Math.round(annotationNode.position.x)],
                ["Y", Math.round(annotationNode.position.y)],
                ["W", width],
                ["H", height],
              ].map(([label, value]) => (
                <label key={label} className="text-xs text-slate-500">
                  {label}
                  <input
                    readOnly
                    value={value}
                    className="mt-1 h-8 w-full rounded-md border border-white/10 bg-black/20 px-2 text-slate-300 outline-none"
                  />
                </label>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              Drag the handles on a selected object to resize it.
            </p>
          </section>

          <section className="p-4">
            <button
              type="button"
              onClick={() => eraseNode(annotationNode.id)}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-rose-400/25 bg-rose-500/10 text-xs font-semibold text-rose-200 transition hover:border-rose-400/50 hover:bg-rose-500/20"
            >
              <Trash2 size={14} />
              Delete object
            </button>
          </section>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-slate-500">
              <SlidersHorizontal size={19} />
            </div>
            <p className="mt-4 text-sm font-semibold text-white">Select a component</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Edit labels, inspect metadata, and tune visual properties from this panel.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
