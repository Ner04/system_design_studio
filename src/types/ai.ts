import type { ArchitectureNodeType } from "./diagram";

export type AiGraphNode = {
  id: string;
  type: ArchitectureNodeType;
  data: {
    label: string;
    description?: string;
  };
};

export type AiGraphEdge = {
  source: string;
  target: string;
  label?: string;
};

export type AiGraph = {
  nodes: AiGraphNode[];
  edges: AiGraphEdge[];
};

/**
 * What the document is for. Interview mode covers what a system design interview is scored on;
 * delivery mode adds the operational sections a team needs before building.
 */
export type DocumentMode = "INTERVIEW" | "DELIVERY";

/** Mirrors GenerationProgressResponse on the backend. */
export type GenerationProgress = {
  active: boolean;
  completed: number;
  total: number;
  currentStep: string;
};

export type AiGenerationResponse = {
  status: string;
  message: string;
  model: string;
  title: string;
  graph?: AiGraph;
  markdown?: string;
  explanation: string[];
  interviewQuestions: string[];
};
