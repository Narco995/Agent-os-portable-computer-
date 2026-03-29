import OpenAI from "openai";

// ── Multi-provider fallback chain ───────────────────────────────────────────
// Priority: OpenRouter → Replit/custom proxy → Groq → Google AI Studio → OpenAI → Ollama
// Set AI_PROVIDER=openrouter|groq|google|openai|replit|ollama to force one.
// Each provider reads its own env vars; the first with credentials wins.

export interface AIProvider {
  client: OpenAI;
  model: string;
  name: string;
}

// Built-in OpenRouter key — can be overridden by OPENROUTER_API_KEY env var
const BUILTIN_OPENROUTER_KEY =
  process.env.OPENROUTER_API_KEY ??
  "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";

function tryBuildProvider(): AIProvider {
  const forced = process.env.AI_PROVIDER?.toLowerCase();

  // ── 1. OpenRouter (primary — routes to 200+ models) ─────────────────────
  if (!forced || forced === "openrouter") {
    return {
      client: new OpenAI({
        apiKey: BUILTIN_OPENROUTER_KEY,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://agent-os.computer",
          "X-Title": "Agent OS Portable Computer",
        },
      }),
      // Best free/fast model on OpenRouter; override with AI_MODEL env var
      model: process.env.AI_MODEL ?? "meta-llama/llama-3.3-70b-instruct",
      name: "openrouter",
    };
  }

  // ── 2. Replit / custom OpenAI-compatible proxy ───────────────────────────
  if (
    forced === "replit" &&
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL &&
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY
  ) {
    return {
      client: new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      }),
      model: process.env.AI_MODEL ?? "gpt-4o",
      name: "replit-proxy",
    };
  }

  // ── 3. Groq ──────────────────────────────────────────────────────────────
  if (forced === "groq" && process.env.GROQ_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      }),
      model: process.env.AI_MODEL ?? "llama-3.3-70b-versatile",
      name: "groq",
    };
  }

  // ── 4. Google AI Studio ──────────────────────────────────────────────────
  if (forced === "google" && process.env.GOOGLE_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.GOOGLE_API_KEY,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      }),
      model: process.env.AI_MODEL ?? "gemini-2.0-flash",
      name: "google-ai-studio",
    };
  }

  // ── 5. OpenAI ────────────────────────────────────────────────────────────
  if (forced === "openai" && process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      name: "openai",
    };
  }

  // ── 6. Ollama (local, no key) ────────────────────────────────────────────
  const ollamaBase = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
  if (forced === "ollama") {
    return {
      client: new OpenAI({ apiKey: "ollama", baseURL: ollamaBase }),
      model: process.env.AI_MODEL ?? "llama3.2",
      name: "ollama",
    };
  }

  // ── Default fallback: OpenRouter with built-in key ───────────────────────
  return {
    client: new OpenAI({
      apiKey: BUILTIN_OPENROUTER_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://agent-os.computer",
        "X-Title": "Agent OS Portable Computer",
      },
    }),
    model: process.env.AI_MODEL ?? "meta-llama/llama-3.3-70b-instruct",
    name: "openrouter",
  };
}

export const provider = tryBuildProvider();
export const openai = provider.client;

console.info(`[AI] Provider: ${provider.name} | Model: ${provider.model}`);
