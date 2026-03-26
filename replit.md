# Agent OS — AI Portable Virtual Computer

## Overview

A fully self-hosted AI-controllable portable virtual computer. Any AI agent can connect via REST API or WebSocket and control a cyberpunk virtual desktop environment.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild for API, Vite for frontend
- **AI**: OpenAI via Replit AI Integration proxy (gpt-5.2)
- **State Management**: Zustand (frontend)
- **UI**: React + Vite + Tailwind CSS + Radix UI

## Design Style

- Dark cyberpunk/futuristic with neon cyan (#00d4ff) primary
- Neon green (#00ff88) success, red (#ff3366) destructive, terminal-green (#00ff41) for terminal
- Glassmorphism panels, CRT/scanline overlay effects, boot sequence on load

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── agent-os/           # React+Vite cyberpunk desktop OS frontend
│   └── api-server/         # Express API server (port 8080)
├── lib/
│   ├── api-spec/           # OpenAPI spec v0.2.0 + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   ├── integrations-openai-ai-server/  # OpenAI client for server
│   └── integrations-openai-ai-react/   # OpenAI hooks for React
└── scripts/                # Utility scripts
```

## Frontend Apps (agent-os)

All apps live in `artifacts/agent-os/src/components/apps/`:

| App | File | Description |
|-----|------|-------------|
| Terminal | `TerminalApp.tsx` | Bash-like terminal with command simulation |
| Browser | `BrowserApp.tsx` | Virtual web browser |
| System Monitor | `HardwareMonitorApp.tsx` | CPU/memory/network charts |
| AI Router | `RouterApp.tsx` | Multi-agent management and dispatch |
| Code Editor | `EditorApp.tsx` | Syntax-highlighted text editor |
| AI Chat | `AIChatApp.tsx` | Real SSE-streaming chat with GPT-5.2 |
| File Manager | `FileManagerApp.tsx` | Virtual filesystem CRUD browser |
| Code IDE | `CodeIDEApp.tsx` | Execute JavaScript, Python, Bash in sandbox |
| Memory Vault | `MemoryApp.tsx` | Agent episodic/semantic/procedural memory |

Window management, app registry, and z-order: `src/store/os-store.ts`
Desktop icons + window rendering: `src/components/os/Desktop.tsx`

## API Endpoints (api-server)

All endpoints prefixed with `/api`:

| Method | Path | Description |
|--------|------|-------------|
| GET | /healthz | Health check |
| GET/POST | /agents | List/register AI agents |
| DELETE | /agents/:id | Unregister agent |
| POST | /commands | Execute computer use commands |
| GET | /system/state | System state snapshot |
| GET | /apps | List installed apps |
| GET/POST | /tasks | List/create multi-step tasks |
| GET | /tasks/:id | Get task status |
| GET/POST | /files | Virtual filesystem list/create |
| GET/PUT/DELETE | /files/:id | CRUD on individual file |
| GET/POST | /memory | Agent memory list/store |
| DELETE | /memory/:id | Delete memory |
| POST | /code/run | Execute JS/Python/Bash |
| GET/POST | /openai/conversations | Chat conversation management |
| DELETE | /openai/conversations/:id | Delete conversation |
| GET | /openai/conversations/:id/messages | Get messages |
| POST | /openai/conversations/:id/messages | Send message (SSE streaming) |
| WS | /api/ws | WebSocket for real-time events |

## Database Schema

Tables in PostgreSQL:
- `agents` — registered AI agents
- `commands` — executed command history
- `tasks` — multi-step task tracking
- `virtual_files` — virtual filesystem entries
- `memories` — agent memory (episodic/semantic/procedural/note)
- `conversations` — AI chat conversations
- `messages` — chat messages per conversation

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only `.d.ts` files during typecheck; JS bundling by esbuild/vite
- **Project references** — when package A depends on B, A's tsconfig must list B in `references`

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively builds all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes in `src/routes/`.
- Entry: `src/index.ts` — reads PORT, starts Express + WebSocket
- App setup: `src/app.ts` — CORS, JSON parsing, routes at `/api`
- Depends on: `@workspace/db`, `@workspace/api-zod`, `@workspace/integrations-openai-ai-server`

### `artifacts/agent-os` (`@workspace/agent-os`)

React+Vite cyberpunk desktop OS frontend.
- Vite proxy: `/api/*` → `http://localhost:8080` (dev mode)
- Depends on: `@workspace/api-client-react`, `@workspace/integrations-openai-ai-react`

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.
- `pnpm --filter @workspace/db run push` — push schema to dev DB
- `pnpm --filter @workspace/db run push-force` — force push

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec v0.2.0 (`openapi.yaml`) + Orval config.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate clients

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client.

### `lib/integrations-openai-ai-server` (`@workspace/integrations-openai-ai-server`)

OpenAI client using Replit AI Integration proxy. Uses `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`.

### `lib/integrations-openai-ai-react` (`@workspace/integrations-openai-ai-react`)

React hooks for OpenAI AI integration.

### `scripts` (`@workspace/scripts`)

Utility scripts. Run via `pnpm --filter @workspace/scripts run <script>`.
