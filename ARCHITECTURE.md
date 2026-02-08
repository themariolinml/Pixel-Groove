# Pixel-Groove Architecture

## Goal

A graph-based workflow canvas where users create, chain, and remix AI-generated media — images, text, audio, and video — by connecting typed nodes in a visual DAG. Users build complex creative pipelines by wiring outputs of one generation step into the inputs of another.

**Example workflow:** Text prompt → Generate Image → Describe Image → Generate Variation → Final Output

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (TBD)                     │
│         Visual canvas with draggable nodes           │
│         Port-based connections between nodes         │
│         SSE subscription for live progress           │
└──────────────────────┬──────────────────────────────┘
                       │ REST + SSE
┌──────────────────────▼──────────────────────────────┐
│                  FastAPI Backend                      │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Graph CRUD  │  │  Execution   │  │   Media    │ │
│  │   Routes    │  │   Routes     │  │  Serving   │ │
│  └──────┬──────┘  └──────┬───────┘  └────────────┘ │
│         │                │                           │
│  ┌──────▼────────────────▼───────────────────────┐  │
│  │            Application Layer                   │  │
│  │   GraphOperations    ExecutionOperations       │  │
│  └──────┬────────────────┬───────────────────────┘  │
│         │                │                           │
│  ┌──────▼────────────────▼───────────────────────┐  │
│  │             Domain Layer                       │  │
│  │  Graph ─ Node ─ Edge ─ Port (typed dataflow)  │  │
│  │  GraphExecutor ─ NodeExecutor                  │  │
│  └──────┬────────────────────────────────────────┘  │
│         │                                            │
│  ┌──────▼────────────────────────────────────────┐  │
│  │          Infrastructure Layer                  │  │
│  │  GeminiClient  LocalStorage  JsonRepository   │  │
│  └───────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Tech Stack

| Component        | Technology                        | Status  |
|------------------|-----------------------------------|---------|
| Language         | Python 3.12                       | Done    |
| Framework        | FastAPI                           | Done    |
| Package Manager  | uv                                | Done    |
| AI Provider      | Google Gemini (`google-genai` SDK) | Done    |
| Validation       | Pydantic v2                       | Done    |
| Image Processing | Pillow                            | Done    |
| Persistence      | JSON files (local filesystem)     | Done    |
| Cache            | In-memory dict with TTL           | Done    |
| Streaming        | Server-Sent Events (SSE)          | Done    |
| Frontend         | TBD                               | Planned |

## Core Concept: Port-Based Dataflow

Every node has **typed input and output ports**. Data flows through edges that connect an output port to a compatible input port. The type system prevents invalid connections at creation time.

```
┌─────────────────────┐         ┌─────────────────────┐
│   Text-to-Image     │         │   Image-to-Text     │
│                     │         │                     │
│  params: {prompt}   │         │  params: {prompt}   │
│                     │  image  │                     │
│          [out:image]├────────►│[in:image]           │
│                     │         │          [out:text] ├──►
└─────────────────────┘         └─────────────────────┘
```

### Port Types

| Type    | Description                     |
|---------|---------------------------------|
| `image` | PNG/JPG image bytes             |
| `text`  | String content                  |
| `audio` | Audio bytes (future)            |
| `video` | Video bytes (future)            |
| `any`   | Accepts any type (future)       |

### Node Types

| Node Type        | Inputs      | Outputs     | What it does                          |
|------------------|-------------|-------------|---------------------------------------|
| `text_to_image`  | —           | image       | Generate image from text prompt       |
| `text_to_text`   | —           | text        | Generate text from text prompt        |
| `image_to_text`  | image       | text        | Describe/analyze an image             |
| `image_to_image` | image       | image       | Modify image based on prompt          |

Text prompts are set via node `params`, not ports. Ports carry media data between nodes.

## Gemini Models (Available via API Key)

| Category | Model ID | Display Name | Use Case |
|----------|----------|-------------|----------|
| **Text** | `gemini-3-flash-preview` | Gemini 3 Flash | Text generation, image analysis (default) |
| | `gemini-2.5-flash` | Gemini 2.5 Flash | Stable fallback |
| **Image** | `imagen-4.0-generate-001` | Imagen 4 | Image generation (default) |
| | `imagen-4.0-fast-generate-001` | Imagen 4 Fast | Faster, lower quality |
| | `imagen-4.0-ultra-generate-001` | Imagen 4 Ultra | Highest quality |
| **Video** | `veo-3.0-generate-001` | Veo 3 | Video generation (future) |
| | `veo-3.0-fast-generate-001` | Veo 3 Fast | Faster video (future) |

## Backend Structure

```
backend/
├── main.py                              # FastAPI app entry point
├── src/
│   ├── domain/
│   │   ├── models/
│   │   │   ├── ports.py                 # Port, PortType, Connection
│   │   │   ├── media.py                 # MediaResult, MediaUrls
│   │   │   ├── graph.py                 # Graph, Node, Edge (with cycle detection)
│   │   │   └── execution.py             # ExecutionContext, ExecutionEvent
│   │   └── services/
│   │       ├── node_executor.py         # Runs a single node via Gemini
│   │       └── graph_executor.py        # Runs full DAG in topological order
│   ├── core/
│   │   ├── config.py                    # Settings (pydantic-settings)
│   │   ├── di.py                        # Dependency injection
│   │   ├── exceptions.py                # Domain exceptions
│   │   ├── logging_config.py            # Logging setup
│   │   └── utils/
│   │       ├── graph_utils.py           # Topological sort, dependency walking
│   │       └── id_generator.py          # UUID-based IDs
│   ├── infrastructure/
│   │   ├── gemini_client.py             # Google Gemini SDK wrapper
│   │   ├── local_storage.py             # File storage + thumbnails
│   │   ├── memory_cache.py              # In-memory TTL cache
│   │   └── json_repository.py           # JSON file persistence
│   ├── application/
│   │   ├── dto/
│   │   │   ├── requests.py              # Pydantic request models
│   │   │   └── responses.py             # Pydantic response models
│   │   └── use_cases/
│   │       ├── graph_operations.py      # Graph/node/edge CRUD
│   │       └── execution_operations.py  # Start/stream/cancel execution
│   └── presentation/
│       ├── routes/
│       │   ├── graphs.py                # Graph CRUD + edge endpoints
│       │   ├── nodes.py                 # Node CRUD + regenerate
│       │   └── execution.py             # Execution + SSE stream
│       └── middleware/
│           └── error_handler.py         # Exception → HTTP response mapping
├── storage/
│   ├── graphs/                          # Persisted graph JSON files
│   └── media/                           # Generated media files
├── .env                                 # Real config (gitignored)
├── .env.example                         # Template
└── .gitignore
```

## API Endpoints

### Graphs
| Method   | Path                              | Description              |
|----------|-----------------------------------|--------------------------|
| `POST`   | `/api/graphs/`                    | Create graph             |
| `GET`    | `/api/graphs/`                    | List all graphs          |
| `GET`    | `/api/graphs/{id}`                | Get graph by ID          |
| `DELETE` | `/api/graphs/{id}`                | Delete graph             |

### Nodes
| Method   | Path                                        | Description              |
|----------|---------------------------------------------|--------------------------|
| `POST`   | `/api/graphs/{id}/nodes/`                   | Create node (auto-init ports) |
| `PATCH`  | `/api/graphs/{id}/nodes/{node_id}`          | Update node params/position |
| `DELETE` | `/api/graphs/{id}/nodes/{node_id}`          | Delete node + edges      |
| `POST`   | `/api/graphs/{id}/nodes/{node_id}/regenerate` | Re-run node generation |

### Edges
| Method   | Path                                        | Description              |
|----------|---------------------------------------------|--------------------------|
| `POST`   | `/api/graphs/{id}/edges/`                   | Create edge (validates port types + cycles) |
| `DELETE` | `/api/graphs/{id}/edges/{edge_id}`          | Delete edge              |

### Execution
| Method   | Path                                        | Description              |
|----------|---------------------------------------------|--------------------------|
| `POST`   | `/api/executions/`                          | Start graph execution    |
| `GET`    | `/api/executions/{id}/stream`               | SSE event stream         |
| `DELETE` | `/api/executions/{id}`                      | Cancel execution         |

### Other
| Method   | Path        | Description    |
|----------|-------------|----------------|
| `GET`    | `/health`   | Health check   |
| `GET`    | `/media/**` | Static media files |

## Execution Flow

1. Client sends `POST /api/executions/` with `graph_id` and `output_node_ids`
2. Backend walks backwards from output nodes to find all required nodes
3. Topological sort determines execution order
4. For each node in order:
   - Resolve input data from upstream node results via port connections
   - Call Gemini API (generate image, text, or analyze image)
   - Store result to filesystem
   - Emit SSE event (`node_started`, `node_completed`, `node_failed`)
5. Client receives events via `GET /api/executions/{id}/stream` (EventSource)

## Current Status

- [x] Project scaffolding + uv setup
- [x] Domain models with port-based dataflow
- [x] Graph CRUD (create, list, get, delete)
- [x] Node CRUD with auto port initialization
- [x] Edge creation with type validation + cycle detection
- [x] JSON file persistence
- [x] Gemini client (text gen, image gen, image analysis)
- [x] Migrated to `google-genai` SDK (from deprecated `google-generativeai`)
- [x] Local storage with thumbnail/preview generation
- [x] Graph execution engine (topological order, port wiring)
- [x] SSE streaming for execution progress
- [x] Error handling middleware
- [x] Text-to-text execution verified end-to-end
- [ ] Frontend canvas UI
- [ ] Audio generation nodes
- [ ] Video generation nodes
- [ ] Tests

## Change Log

| Date       | Change                                                                  |
|------------|-------------------------------------------------------------------------|
| 2026-02-07 | Initial backend — all 7 phases, SDK migrated to google-genai, SSE fixed |
