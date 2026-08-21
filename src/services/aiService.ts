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
  onDiagramReady?: (diagram: AiGenerationResponse) => void,
): Promise<AiGenerationResponse> {
  const trimmedPrompt = prompt.trim();
  const safePrompt = trimmedPrompt || "Design Uber realtime driver tracking";
  const requestId = newRequestId();
  const stopPolling = onProgress ? pollProgress(requestId, onProgress) : undefined;

  try {
    // The diagram is one model call and the document is nine, so the diagram is shown the
    // moment it lands rather than being held back until the document finishes.
    const diagramPromise = fetch(`${API_BASE_URL}/api/ai/generate-diagram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: safePrompt, model }),
    }).then(async (response) => {
      if (!response.ok) throw new Error("AI backend request failed");
      const parsed = (await response.json()) as AiGenerationResponse;
      onDiagramReady?.(parsed);
      return parsed;
    });

    const documentPromise = fetch(`${API_BASE_URL}/api/ai/generate-document`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: safePrompt, model, requestId, mode }),
    }).then(async (response) => {
      if (!response.ok) throw new Error("AI backend request failed");
      return (await response.json()) as AiGenerationResponse;
    });

    const [diagram, document] = await Promise.all([diagramPromise, documentPromise]);

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
