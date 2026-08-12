import {
  Circle,
  Diamond,
  Eraser,
  Frame,
  Group,
  Hand,
  Image,
  MessageSquare,
  MousePointer2,
  MoveUpRight,
  Shapes,
  Square,
  StickyNote,
  Type,
  Waypoints,
} from "lucide-react";

export type CanvasTool =
  | "select"
  | "hand"
  | "rectangle"
  | "roundedRectangle"
  | "circle"
  | "diamond"
  | "text"
  | "arrow"
  | "connector"
  | "stickyNote"
  | "image"
  | "comment"
  | "frame"
  | "group"
  | "eraser";

type EraserToolRailProps = {
  activeTool: CanvasTool;
  isLibraryOpen: boolean;
  onToolChange: (tool: CanvasTool) => void;
  onToggleLibrary: () => void;
};

const tools: Array<{ id: CanvasTool; label: string; shortcut?: string; icon: typeof MousePointer2 }> = [
  { id: "select", label: "Select", shortcut: "V", icon: MousePointer2 },
  { id: "hand", label: "Hand", shortcut: "H / hold Space", icon: Hand },
  { id: "rectangle", label: "Rectangle", shortcut: "R", icon: Square },
  { id: "roundedRectangle", label: "Rounded Rectangle", icon: Frame },
  { id: "circle", label: "Circle", shortcut: "O", icon: Circle },
  { id: "diamond", label: "Diamond", shortcut: "D", icon: Diamond },
  { id: "text", label: "Text", shortcut: "T", icon: Type },
  { id: "arrow", label: "Arrow", shortcut: "A", icon: MoveUpRight },
  { id: "connector", label: "Connector", shortcut: "C", icon: Waypoints },
  { id: "stickyNote", label: "Sticky Note", shortcut: "S", icon: StickyNote },
  { id: "image", label: "Image", shortcut: "I", icon: Image },
  { id: "comment", label: "Comment", icon: MessageSquare },
  { id: "frame", label: "Frame", shortcut: "F", icon: Frame },
  { id: "group", label: "Group Selection", shortcut: "Cmd+G", icon: Group },
  { id: "eraser", label: "Eraser", shortcut: "E", icon: Eraser },
];

export function EraserToolRail({
  activeTool,
  isLibraryOpen,
  onToolChange,
  onToggleLibrary,
}: EraserToolRailProps) {
  return (
    <div className="pointer-events-auto absolute left-4 top-20 z-30 flex flex-col overflow-hidden rounded-lg border border-white/10 bg-ink-900/95 p-1 shadow-panel backdrop-blur">
      <button
        type="button"
        title={isLibraryOpen ? "Hide Components" : "Show Components"}
        aria-label={isLibraryOpen ? "Hide Components" : "Show Components"}
        onClick={onToggleLibrary}
        className={`mb-1 flex h-10 w-10 items-center justify-center rounded-md transition ${
          isLibraryOpen
            ? "bg-accent-blue text-white shadow-glow"
            : "text-slate-400 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Shapes size={17} strokeWidth={1.9} />
      </button>

      <div className="mb-1 h-px bg-white/10" />

      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;

        return (
          <button
            key={tool.id}
            type="button"
            title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ""}`}
            aria-label={tool.label}
            onClick={() => onToolChange(tool.id)}
            className={`flex h-10 w-10 items-center justify-center rounded-md transition ${
              isActive
                ? "bg-white text-ink-950"
                : "text-slate-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={17} strokeWidth={1.9} />
          </button>
        );
      })}
    </div>
  );
}
