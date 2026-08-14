import { useState } from "react";
import { generateSystemDesign } from "../services/aiService";
import { useDiagramStore } from "../store/diagramStore";
import { useDocumentStore } from "../store/documentStore";
import type { DocumentMode, GenerationProgress } from "../types/ai";
import { allPrompts } from "../data/interviewPrompts";

/** A short row of suggestions for places with no room for the full graded library. */
export const examplePrompts = [
  "Design URL Shortener like TinyURL",
  "Design WhatsApp",
  "Design Uber",
  "Design Rate Limiter",
];

export const supportedModels = ["llama3", "qwen", "mistral", "deepseek"] as const;
export type SupportedModel = (typeof supportedModels)[number];

export function useDesignGeneration(initialPrompt = allPrompts[0]) {
  const replaceGraph = useDiagramStore((state) => state.replaceGraph);
  const replaceDocument = useDocumentStore((state) => state.replaceDocument);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [model, setModel] = useState<SupportedModel>("llama3");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastMessage, setLastMessage] = useState("Ollama ready");
  const [progress, setProgress] = useState<GenerationProgress | undefined>();
  const [documentMode, setDocumentMode] = useState<DocumentMode>("INTERVIEW");

  const runGeneration = async (nextPrompt = prompt) => {
    setPrompt(nextPrompt);
    setIsGenerating(true);
    setProgress(undefined);
    setLastMessage(`Generating with ${model}...`);

    try {
      const result = await generateSystemDesign(nextPrompt, model, setProgress, documentMode);
      if (result.graph) replaceGraph(result.graph);
      if (result.markdown) replaceDocument(result.title, result.markdown);
      setLastMessage(`${result.status}: ${result.title}. ${result.message}`);
    } catch {
      setLastMessage("Generation failed. Try another prompt.");
    } finally {
      setIsGenerating(false);
      setProgress(undefined);
    }
  };

  return {
    prompt,
    setPrompt,
    model,
    setModel,
    isGenerating,
    lastMessage,
    progress,
    documentMode,
    setDocumentMode,
    runGeneration,
  };
}
