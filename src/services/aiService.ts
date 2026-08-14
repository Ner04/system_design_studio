import { localMockDesign } from "./mockAi";
import type { AiGenerationResponse, DocumentMode, GenerationProgress } from "../types/ai";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const PROGRESS_POLL_INTERVAL_MS = 1200;

export type ProgressListener = (progress: GenerationProgress) => void;

function newRequestId(): string {
  // randomUUID is unavailable on insecure origins, which includes some LAN dev setups.
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * The document is written one section at a time and takes minutes on a local model, so the
 * backend exposes how far it has got. Polling stops as soon as the generation resolves.
 */
function pollProgress(requestId: string, onProgress: ProgressListener): () => void {
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/progress/${requestId}`);
      if (response.ok && !stopped) {
        const progress = (await response.json()) as GenerationProgress;
        if (progress.active) onProgress(progress);
      }
    } catch {
      // A failed poll is not worth surfacing; the generation itself reports the real outcome.
    }
    if (!stopped) window.setTimeout(tick, PROGRESS_POLL_INTERVAL_MS);
  };

  window.setTimeout(tick, PROGRESS_POLL_INTERVAL_MS);
  return () => {
    stopped = true;
  };
}

export async function generateSystemDesign(
  prompt: string,
  model = "mock-local",
  onProgress?: ProgressListener,
  mode: DocumentMode = "INTERVIEW",
): Promise<AiGenerationResponse> {
  const trimmedPrompt = prompt.trim();
  const safePrompt = trimmedPrompt || "Design Uber realtime driver tracking";
  const requestId = newRequestId();
  const stopPolling = onProgress ? pollProgress(requestId, onProgress) : undefined;

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
        body: JSON.stringify({ prompt: safePrompt, model, requestId, mode }),
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
  } finally {
    stopPolling?.();
  }
}
