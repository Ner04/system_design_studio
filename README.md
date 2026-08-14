# System Design Studio

A local-first workspace for practising system design. Describe a system in plain English and it
produces two things side by side: an editable architecture diagram on a canvas, and a technical
design document shaped like the answer a system design interview is actually scored on.

Everything runs on your own machine through [Ollama](https://ollama.com). No API keys, no cloud
service, no per-request cost.

---

## Why this exists

Most system design practice is passive. You read a worked example, it makes sense, and two weeks
later in an interview you freeze on "how would you shard this?" — because reading is recognition
and an interview is generation under pressure.

This project is built for the active loop instead: **sketch your own design on the canvas first,
then generate one and diff it against yours.** The gaps are your study list.

That goal drives a design constraint that shows up everywhere in the codebase:

> A learner cannot tell when a small model is wrong. So the model is never trusted with anything
> it is unreliable at.

Small local models are good at prose and domain vocabulary. They are bad at structure, format
compliance and arithmetic. So the work is split accordingly:

| Concern | Who does it | Why |
| --- | --- | --- |
| Prose, component reasoning, tradeoffs | The model | It is genuinely good at this |
| Section structure and numbering | Java | A missing heading breaks the document |
| Capacity arithmetic | Java | Small models produce confident, wrong maths |
| Graph connectivity | Java (validated) | A disconnected diagram is worse than none |
| Testing / rollout checklists | Java | Templates need no model |

An authoritative-looking document with subtly wrong content is worse than no document, because
the reader most in need of it is the least able to spot the error.

---

## What it does

**Generates architecture diagrams** that are structurally validated before you ever see them.
Graphs with orphan nodes, fewer than four components, or disconnected islands are rejected and
retried; if the model cannot produce a usable graph, the app falls back to a deterministic design
and tells you exactly why in the status line.

**Generates design documents section by section** rather than in one pass, because a small model
asked for 2,500 words at once loses headings and degrades into repetition. Each section gets its
own focused prompt, and any section that fails falls back independently — one bad response never
costs the whole document.

**Computes capacity estimates instead of asking for them.** The model supplies only the
assumptions — daily active users, actions per user, record size, peak multiplier — through
JSON-schema constrained decoding. Every derived figure is calculated in Java:

```
500K users x 20 seat lookups = 10M/day
10M / 86,400 s = 115/s        peak = 115 x 10 = 1.2K/s
10M x 1% writes = 100K/day    at 100 B = 9.5 MB/day
```

The working is shown, not just the totals, so you can reproduce the method on a whiteboard.
Implausible values are clamped, so a bad model response cannot render a table that is
authoritative and nonsense.

**Ships 45 graded interview problems** — 10 Easy, 23 Medium, 12 Hard — filterable in the sidebar,
so you have a study path rather than a blank prompt box.

**Edits everything.** The generated diagram is a real canvas: drag components in from the library,
rewrite labels, group nodes, annotate, delete. The document is a Markdown editor with Write, Split
and Preview modes.

---

## Two document modes

The default is **Interview**, which contains only what an interview is scored on:

```
1. Problem and Requirements       functional, non-functional, out of scope
2. Capacity Estimation            computed in Java, not written by the model
3. High-Level Architecture        layer table plus component details
4. Data Model and Schema          entity JSON, event payload, SQL DDL
5. API Design                     terse signatures, whiteboard style
6. Deep Dive: The Hard Part       the section interviewers spend most time on
7. Tradeoffs                      three axes, each with its real cost named
8. Bottlenecks and Failure Modes
9. Interview Discussion Points    8 likely questions with answer sketches
```

**Delivery** mode appends the operational sections a team needs before building — Security,
Testing Strategy, Rollout Plan, and an Appendix whose dependency table is derived from the
technologies the document actually mentions.

Interview mode takes roughly three minutes on a small local model. A progress indicator reports
which section is being written, since the wait is made of discrete steps rather than one opaque
pause.

---

## Getting started

### Prerequisites

- **Node.js 18+**
- **Java 21**
- **[Ollama](https://ollama.com)** with at least one model pulled

```bash
ollama pull qwen2.5:3b     # ~1.9 GB, works on 8 GB machines
```

Any installed model works. If you request one that is not installed, the backend resolves to the
closest match rather than failing.

### Run it

```bash
# 1. Ollama
ollama serve

# 2. Backend  ->  http://localhost:8081
cd backend
mvn spring-boot:run

# 3. Frontend ->  http://localhost:5173
npm install
npm run dev
```

Open http://localhost:5173, pick a problem from the sidebar, and hit **Generate design**.

### Without Ollama

The app stays usable. With `OLLAMA_ENABLED=false` — or whenever Ollama is unreachable — it serves
deterministic mock designs and labels them clearly in the status line, so a fallback is never
mistaken for a real generation.

---

## Configuration

Backend, via environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SERVER_PORT` | `8081` | Backend port |
| `OLLAMA_ENABLED` | `true` | Set false to force deterministic mock output |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama endpoint |
| `OLLAMA_MODEL` | `llama3` | Default model when none is requested |
| `OLLAMA_RETRIES` | `2` | Attempts before falling back |
| `OLLAMA_READ_TIMEOUT_SECONDS` | `300` | Generation can take minutes on modest hardware |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated origins |
| `DB_URL` | file-based H2 | Any JDBC URL; MySQL driver is bundled |

Frontend: set `BACKEND_URL` if the backend is not on `localhost:8081`. The Vite dev proxy reads
it, and it must match `server.port` in `backend/src/main/resources/application.yml`.

---

## Architecture

```
React + Vite (5173)                Spring Boot (8081)              Ollama (11434)
├─ DiagramCanvas   ──┐             ├─ AiController          ──┐
│  React Flow        │             │  ├─ DesignDocumentComposer│  qwen2.5 / llama3
├─ DocumentEditor    ├─ /api ──►   │  ├─ CapacityEstimator   ──┤  deepseek / mistral
│  Markdown          │             │  └─ OllamaJsonSanitizer   │
└─ Zustand stores  ──┘             ├─ Diagram/DocumentController
                                   └─ H2 (./data/eraser)
```

**Frontend** — React 18, TypeScript, Vite 6, Tailwind CSS, [React Flow](https://reactflow.dev)
(`@xyflow/react`) for the canvas, Zustand for state, `react-markdown` with `remark-gfm`.

**Backend** — Spring Boot 3.4.1 on Java 21, Spring Data JPA, Bean Validation, WebSocket/STOMP for
collaboration sync, H2 by default.

### Key classes

| Class | Responsibility |
| --- | --- |
| `DesignDocumentComposer` | Owns document structure; generates section by section with per-section fallback |
| `CapacityEstimator` | Requests assumptions under a JSON schema, computes every derived figure |
| `OllamaJsonSanitizer` | Coerces model output into a renderable graph, then validates connectivity |
| `OllamaClient` | Model resolution, structured output, timeout handling |
| `GenerationProgressTracker` | Per-request progress, polled by the browser |
| `AiGenerationService` | Orchestration and deterministic mock fallbacks |

### API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/ai/generate-diagram` | Prompt to validated architecture graph |
| `POST` | `/api/ai/generate-document` | Prompt to design document (`mode`: `INTERVIEW` \| `DELIVERY`) |
| `GET` | `/api/ai/progress/{requestId}` | Progress while a document is being written |
| `POST` | `/api/diagram/save`, `/api/document/save` | Persist |
| `GET` | `/api/diagram/{id}`, `/api/document/{id}` | Load |
| `WS` | `/diagram/{diagramId}/sync` | Realtime collaboration channel |

---

## Development

```bash
npm run dev        # frontend with HMR
npm run build      # typecheck and production build
npm run lint

cd backend
mvn test           # 29 tests
mvn spring-boot:run
```

The test suite deliberately concentrates on the parts that must not be wrong: capacity arithmetic
and its clamping, graph connectivity validation, document structure across both modes, and the
fallback behaviour when Ollama is unavailable.

---

## Honest limitations

- **Model judgement is only as good as the model.** A 3B model will occasionally make a
  defensible-sounding architectural call a senior engineer would argue with. Structure and
  arithmetic are now reliable; judgement is not. Treat the output as a sparring partner and keep a
  human-authored source as ground truth.
- **Generation is slow on modest hardware** — roughly three minutes for a full interview document
  on an 8 GB machine, because sections are generated serially.
- **Capacity assumptions are the model's**, clearly labelled as assumptions. The arithmetic on top
  of them is guaranteed; the inputs are worth sanity-checking, and adjusting them is good practice.

---

## Acknowledgements

The graded interview problem list follows
[awesome-system-design-resources](https://github.com/ashishps1/awesome-system-design-resources) by
Ashish Pratap Singh. Only the problem names are used, as prompts.
