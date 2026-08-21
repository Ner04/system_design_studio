import { create } from "zustand";
import { seedTechnicalDocument } from "../data/seedDocument";

type DocumentPanelMode = "write" | "split" | "preview";

type DocumentState = {
  title: string;
  markdown: string;
  panelMode: DocumentPanelMode;
  updatedAt: Date;
  setTitle: (title: string) => void;
  setMarkdown: (markdown: string) => void;
  replaceDocument: (title: string, markdown: string) => void;
  /** Renders a generation still in flight, so sections appear as the backend writes them. */
  streamDocument: (markdown: string) => void;
  setPanelMode: (panelMode: DocumentPanelMode) => void;
};

/** The composer opens the document with "# Technical Design Document: <name>". */
function titleFromMarkdown(markdown: string, fallback: string) {
  const heading = markdown.split("\n").find((line) => line.startsWith("# "));
  if (!heading) return fallback;
  return heading.replace(/^#\s+/, "").replace(/^Technical Design Document:\s*/i, "").trim() || fallback;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  title: "Uber Realtime Driver Tracking",
  markdown: seedTechnicalDocument,
  panelMode: "write",
  updatedAt: new Date(),
  setTitle: (title) => set({ title, updatedAt: new Date() }),
  setMarkdown: (markdown) => set({ markdown, updatedAt: new Date() }),
  replaceDocument: (title, markdown) =>
    set({ title, markdown, panelMode: "preview", updatedAt: new Date() }),
  streamDocument: (markdown) =>
    set((state) => ({
      markdown,
      title: titleFromMarkdown(markdown, state.title),
      // Rendered preview, not raw Markdown, is what makes the progress legible.
      panelMode: "preview",
      updatedAt: new Date(),
    })),
  setPanelMode: (panelMode) => set({ panelMode }),
}));
