import { ChevronDown, GripVertical, Search, X } from "lucide-react";
import type { DragEvent } from "react";
import { useMemo, useState } from "react";
import { architectureComponentGroups, architectureComponents } from "./componentCatalog";
import type { ArchitectureComponent } from "./componentCatalog";
import { useDiagramStore } from "../store/diagramStore";
import { nodeVisuals } from "../utils/nodeStyle";

type ComponentLibraryPanelProps = {
  onClose: () => void;
};

export function ComponentLibraryPanel({ onClose }: ComponentLibraryPanelProps) {
  const [query, setQuery] = useState("");
  const [width, setWidth] = useState(304);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const addArchitectureComponent = useDiagramStore((state) => state.addArchitectureComponent);

  const filteredComponents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return architectureComponents;
    return architectureComponents.filter((component) =>
      [component.label, component.group, component.description, component.badge]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalized)),
    );
  }, [query]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const beginDrag = (event: DragEvent<HTMLButtonElement>, component: ArchitectureComponent) => {
    event.dataTransfer.setData("application/system-design-component", JSON.stringify(component));
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <aside
      className="pointer-events-auto absolute bottom-5 left-16 top-20 z-20 flex min-w-[260px] max-w-[380px] flex-col overflow-hidden rounded-lg border border-white/10 bg-ink-900/95 shadow-panel backdrop-blur"
      style={{ width }}
    >
      <div className="border-b border-white/10 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Components
            </p>
            <p className="mt-1 text-xs text-slate-500">Drag-ready cloud architecture library</p>
          </div>
          <button
            type="button"
            aria-label="Close component library"
            title="Close"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/10 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>
        <div className="mt-3 flex h-9 items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2">
          <Search size={14} className="text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search AWS, Kafka, Redis..."
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {architectureComponentGroups.map((group) => {
          const groupItems = filteredComponents.filter((component) => component.group === group);
          if (!groupItems.length) return null;
          const isCollapsed = collapsedGroups.has(group);

          return (
            <section key={group} className="mb-4 last:mb-0">
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className="mb-2 flex w-full items-center justify-between rounded-md px-1 py-1 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-300"
              >
                <span>{group}</span>
                <ChevronDown
                  size={13}
                  className={`transition ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
                />
              </button>
              <div className={`grid grid-cols-2 gap-2 ${isCollapsed ? "hidden" : ""}`}>
                {groupItems.map((component) => {
                  const visual = nodeVisuals[component.nodeType];
                  const Icon = visual.icon;

                  return (
                    <button
                      key={component.id}
                      type="button"
                      draggable
                      title={component.description}
                      onDragStart={(event) => beginDrag(event, component)}
                      onClick={() => addArchitectureComponent(component)}
                      className="group min-h-[86px] rounded-md border border-white/10 bg-white/[0.035] p-2 text-left transition hover:border-accent-blue/50 hover:bg-accent-blue/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br ring-1 ${visual.className}`}>
                          <Icon size={16} />
                        </span>
                        {component.badge ? (
                          <span className="rounded border border-white/10 bg-black/25 px-1.5 py-0.5 text-[9px] font-semibold text-slate-300">
                            {component.badge}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs font-semibold text-white">{component.label}</p>
                      <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500 group-hover:text-slate-400">
                        {component.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Resize component library"
        title="Resize"
        onPointerDown={(event) => {
          const startX = event.clientX;
          const startWidth = width;
          const target = event.currentTarget;
          target.setPointerCapture(event.pointerId);

          const onMove = (moveEvent: PointerEvent) => {
            setWidth(Math.min(380, Math.max(260, startWidth + moveEvent.clientX - startX)));
          };
          const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
          };

          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp);
        }}
        className="absolute bottom-2 right-1 top-16 flex w-4 cursor-ew-resize items-center justify-center text-slate-600 transition hover:text-slate-300"
      >
        <GripVertical size={14} />
      </button>
    </aside>
  );
}
