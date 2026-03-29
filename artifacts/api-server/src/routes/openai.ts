import { Router, type IRouter } from "express";
import { db, conversations, messages } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { openai, provider } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// System prompt for Agent OS AI assistant
const SYSTEM_PROMPT = `You are an intelligent AI assistant running inside Agent OS — a portable, AI-controllable virtual computer system.

You have access to the entire Agent OS environment:
- Virtual filesystem for reading/writing files
- Terminal for executing commands
- Multiple AI agent management (register, dispatch, coordinate)
- Task scheduler and process management
- Memory system for storing knowledge
- Code execution for JavaScript, Python, and Bash
- Multi-agent orchestration

You assist both human users and external AI agents. Be concise, technical, and helpful. When discussing the computer's capabilities, be specific about what Agent OS can do. You can suggest commands, help debug code, coordinate tasks, and explain how to use the API.

When an external AI agent connects, you help it understand:
- How to register via POST /api/agents
- How to execute commands via POST /api/commands
- Available command types: click, type, terminal, screenshot, open_app, navigate
- WebSocket endpoint: /api/ws for real-time events
- Memory API: POST /api/memory for persistent knowledge storage`;

// Expose current provider/model to frontend
router.get("/openai/model", (_req, res) => {
  res.json({ provider: provider.name, model: provider.model });
});

router.get("/openai/conversations", async (_req, res) => {
  const convs = await db.select().from(conversations).orderBy(desc(conversations.createdAt)).limit(50);
  res.json(convs.map(c => ({
    id: c.id,
    title: c.title,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/openai/conversations", async (req, res) => {
  const { title } = req.body;
  if (!title) { res.status(400).json({ error: "title is required" }); return; }
  const [conv] = await db.insert(conversations).values({ title }).returning();
  res.status(201).json({ id: conv.id, title: conv.title, createdAt: conv.createdAt.toISOString() });
});

router.get("/openai/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id));
  res.json({
    id: conv.id,
    title: conv.title,
    createdAt: conv.createdAt.toISOString(),
    messages: msgs.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })),
  });
});

router.delete("/openai/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).end();
});

router.get("/openai/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id));
  res.json(msgs.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

router.post("/openai/conversations/:id/messages", async (req, res) => {
  const conversationId = parseInt(req.params.id);
  const { content } = req.body;

  if (!content) { res.status(400).json({ error: "content is required" }); return; }

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  // Save user message
  await db.insert(messages).values({ conversationId, role: "user", content });

  // Get chat history — limit to last 20 messages to keep tokens manageable
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(20);

  const chatMessages = history
    .reverse()
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  // Setup SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  let fullResponse = "";

  try {
    const stream = await openai.chat.completions.create({
      model: provider.model,
      max_completion_tokens: 4096,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...chatMessages,
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const chunkContent = chunk.choices[0]?.delta?.content;
      if (chunkContent) {
        fullResponse += chunkContent;
        res.write(`data: ${JSON.stringify({ content: chunkContent })}\n\n`);
      }
    }

    // Save assistant response
    await db.insert(messages).values({ conversationId, role: "assistant", content: fullResponse });

    res.write(`data: ${JSON.stringify({ done: true, model: provider.model, provider: provider.name })}\n\n`);
    res.end();
  } catch (err) {
    logger.error({ err, provider: provider.name, model: provider.model }, "AI streaming error");
    const errorMsg = err instanceof Error ? err.message : "AI service error";
    res.write(`data: ${JSON.stringify({ error: errorMsg, done: true })}\n\n`);
    res.end();
  }
});

export default router;
