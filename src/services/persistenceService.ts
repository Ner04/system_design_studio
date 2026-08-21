import type { AiGraph } from "../types/ai";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/** Ids are kept for the session so a second save updates rather than duplicates. */
let savedDiagramId: string | undefined;
let savedDocumentId: string | undefined;

export type SaveResult = {
  diagramId: string;
  documentId: string;
  savedAt: Date;
};

type DiagramResponse = { id: string };
type DocumentResponse = { id: string };

/**
 * Persists the canvas and the document together, because they are two halves of one design and
 * saving only one of them would leave the pair inconsistent.
 */
export async function saveDesign(
  title: string,
  graph: AiGraph | { nodes: unknown[]; edges: unknown[] },
  markdown: string,
): Promise<SaveResult> {
  const [diagram, document] = await Promise.all([
    postJson<DiagramResponse>("/api/diagram/save", {
      id: savedDiagramId,
      title,
      graph,
    }),
    postJson<DocumentResponse>("/api/document/save", {
      id: savedDocumentId,
      title,
      markdown,
    }),
  ]);

  savedDiagramId = diagram.id;
  savedDocumentId = document.id;
  return { diagramId: diagram.id, documentId: document.id, savedAt: new Date() };
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Save failed (${response.status})`);
  }
  return (await response.json()) as T;
}
