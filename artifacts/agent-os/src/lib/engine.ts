/**
 * Agent Engine v2 API client
 * Connects to FastAPI + LangGraph backend at /api or ENGINE_URL
 */

const ENGINE_URL =
  typeof window !== 'undefined'
    ? (window as any).__ENGINE_URL__ ?? 'http://localhost:8000'
    : 'http://localhost:8000';

export interface EngineHealth {
  status: string;
  timestamp: string;
  available_providers: string[];
  version: string;
}

export interface ProviderInfo {
  name: string;
  model: string;
  priority: number;
  circuit_open: boolean;
  failure_count: number;
  cost_input_per_1m: number;
  cost_output_per_1m: number;
}

export interface ExecuteRequest {
  task: string;
  temperature?: number;
}

export interface AgentResponse {
  agent_id: string;
  task: string;
  final_answer: string;
  reasoning_steps: string[];
  tools_called: { tool: string; query?: string }[];
  execution_metadata: {
    llm_provider: string;
    tokens_used: number;
    cost: number;
  };
}

export interface StreamEvent {
  agent_id: string;
  task: string;
  reasoning_steps: string[];
  tools_called: { tool: string; query?: string }[];
  final_answer: string;
  execution_metadata: Record<string, unknown>;
}

export async function fetchHealth(url = ENGINE_URL): Promise<EngineHealth> {
  const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function fetchProviders(url = ENGINE_URL): Promise<ProviderInfo[]> {
  const res = await fetch(`${url}/providers`);
  if (!res.ok) throw new Error('Failed to fetch providers');
  const data = await res.json();
  return data.providers;
}

export async function executeTask(
  task: string,
  url = ENGINE_URL,
  temperature = 0.7
): Promise<AgentResponse> {
  const res = await fetch(`${url}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, temperature } satisfies ExecuteRequest),
  });
  if (!res.ok) throw new Error(`Execute failed: ${res.status}`);
  return res.json();
}

export async function* streamTask(
  task: string,
  url = ENGINE_URL,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${url}/execute-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error('Stream failed');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      try {
        yield JSON.parse(line.slice(6)) as StreamEvent;
      } catch { /* skip malformed */ }
    }
  }
}
