import { useState } from "react";
import { generateSystemDesign } from "../services/aiService";
import { useDiagramStore } from "../store/diagramStore";
import { useDocumentStore } from "../store/documentStore";

export const examplePrompts = [
  "Design Uber realtime driver tracking",
  "Design Netflix streaming architecture",
  "Design WhatsApp chat system",
  "Design YouTube recommendations",
];

export const supportedModels = ["llama3", "qwen", "mistral", "deepseek"] as const;
export type SupportedModel = (typeof supportedModels)[number];

export function useDesignGeneration(initialPrompt = examplePrompts[0]) {
  const replaceGraph = useDiagramStore((state) => state.replaceGraph);
  const replaceDocument = useDocumentStore((state) => state.replaceDocument);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [model, setModel] = useState<SupportedModel>("llama3");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastMessage, setLastMessage] = useState("Ollama ready");

  const runGeneration = async (nextPrompt = prompt) => {
    setPrompt(nextPrompt);
    setIsGenerating(true);
    setLastMessage("Generating mock design...");

    try {
      const result = await generateSystemDesign(nextPrompt, model);
      if (result.graph) replaceGraph(result.graph);
      if (result.markdown) replaceDocument(result.title, result.markdown);
      setLastMessage(`${result.status}: ${result.title}`);
    } catch {
      setLastMessage("Generation failed. Try another prompt.");
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    prompt,
    setPrompt,
    model,
    setModel,
    isGenerating,
    lastMessage,
    runGeneration,
  };
}
