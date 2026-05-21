import { create } from "zustand";
import { seedTechnicalDocument } from "../data/seedDocument";

type DocumentPanelMode = "write" | "preview";

type DocumentState = {
  title: string;
  markdown: string;
  panelMode: DocumentPanelMode;
  updatedAt: Date;
  setTitle: (title: string) => void;
  setMarkdown: (markdown: string) => void;
  replaceDocument: (title: string, markdown: string) => void;
  setPanelMode: (panelMode: DocumentPanelMode) => void;
};

export const useDocumentStore = create<DocumentState>((set) => ({
  title: "Uber Realtime Driver Tracking",
  markdown: seedTechnicalDocument,
  panelMode: "write",
  updatedAt: new Date(),
  setTitle: (title) => set({ title, updatedAt: new Date() }),
  setMarkdown: (markdown) => set({ markdown, updatedAt: new Date() }),
  replaceDocument: (title, markdown) =>
    set({ title, markdown, panelMode: "preview", updatedAt: new Date() }),
  setPanelMode: (panelMode) => set({ panelMode }),
}));
