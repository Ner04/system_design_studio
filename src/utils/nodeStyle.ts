import {
  Boxes,
  Cable,
  Cloud,
  Database,
  GitBranch,
  Globe2,
  HardDrive,
  Layers3,
  LucideIcon,
  Radio,
  Router,
  Server,
  Smartphone,
  Zap,
} from "lucide-react";
import type { ArchitectureNodeType } from "../types/diagram";

type NodeVisual = {
  icon: LucideIcon;
  label: string;
  className: string;
};

export const nodeVisuals: Record<ArchitectureNodeType, NodeVisual> = {
  service: {
    icon: Server,
    label: "Service",
    className: "from-sky-500/20 to-cyan-400/10 text-sky-200 ring-sky-400/25",
  },
  database: {
    icon: Database,
    label: "Database",
    className: "from-emerald-500/20 to-teal-400/10 text-emerald-200 ring-emerald-400/25",
  },
  cache: {
    icon: Zap,
    label: "Cache",
    className: "from-amber-500/20 to-yellow-300/10 text-amber-200 ring-amber-400/25",
  },
  queue: {
    icon: GitBranch,
    label: "Queue",
    className: "from-fuchsia-500/20 to-pink-400/10 text-fuchsia-200 ring-fuchsia-400/25",
  },
  gateway: {
    icon: Router,
    label: "Gateway",
    className: "from-blue-500/20 to-indigo-400/10 text-blue-200 ring-blue-400/25",
  },
  mobile: {
    icon: Smartphone,
    label: "Mobile",
    className: "from-lime-500/20 to-green-400/10 text-lime-200 ring-lime-400/25",
  },
  cdn: {
    icon: Cloud,
    label: "CDN",
    className: "from-cyan-500/20 to-blue-400/10 text-cyan-200 ring-cyan-400/25",
  },
  loadBalancer: {
    icon: Layers3,
    label: "Balancer",
    className: "from-rose-500/20 to-orange-400/10 text-rose-200 ring-rose-400/25",
  },
  kafka: {
    icon: Cable,
    label: "Stream",
    className: "from-violet-500/20 to-purple-400/10 text-violet-200 ring-violet-400/25",
  },
  redis: {
    icon: HardDrive,
    label: "Redis",
    className: "from-red-500/20 to-orange-400/10 text-red-200 ring-red-400/25",
  },
  websocket: {
    icon: Radio,
    label: "Realtime",
    className: "from-teal-500/20 to-cyan-400/10 text-teal-200 ring-teal-400/25",
  },
};

export const fallbackNodeVisual: NodeVisual = {
  icon: Boxes,
  label: "Component",
  className: "from-slate-500/20 to-slate-400/10 text-slate-200 ring-slate-400/25",
};

export const diagramNodeTypes = Object.keys(nodeVisuals) as ArchitectureNodeType[];

export const internetVisual = {
  icon: Globe2,
  label: "Internet",
};
