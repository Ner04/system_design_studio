import { localMockDesign } from "./mockAi";
import type { AiGenerationResponse } from "../types/ai";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function generateSystemDesign(
  prompt: string,
  model = "mock-local",
): Promise<AiGenerationResponse> {
  const trimmedPrompt = prompt.trim();
  const safePrompt = trimmedPrompt || "Design Uber realtime driver tracking";

  try {
    const [diagramResponse, documentResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/ai/generate-diagram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: safePrompt, model }),
      }),
      fetch(`${API_BASE_URL}/api/ai/generate-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: safePrompt, model }),
      }),
    ]);

    if (!diagramResponse.ok || !documentResponse.ok) {
      throw new Error("AI backend request failed");
    }

    const diagram = (await diagramResponse.json()) as AiGenerationResponse;
    const document = (await documentResponse.json()) as AiGenerationResponse;

    return {
      ...diagram,
      markdown: document.markdown,
      explanation: diagram.explanation?.length ? diagram.explanation : document.explanation,
      interviewQuestions: diagram.interviewQuestions?.length
        ? diagram.interviewQuestions
        : document.interviewQuestions,
    };
  } catch (error) {
    const fallback = localMockDesign(safePrompt, model);
    const reason = error instanceof Error ? error.message : "AI backend request failed";
    return {
      ...fallback,
      status: "MOCK_FALLBACK",
      message: `${reason}. Showing deterministic local output instead.`,
    };
  }
}
