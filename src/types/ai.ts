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
