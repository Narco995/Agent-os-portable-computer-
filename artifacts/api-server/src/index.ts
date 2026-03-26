import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: "/api/ws" });

const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
  clients.add(ws);
  logger.info({ clients: clients.size }, "WebSocket client connected");

  ws.send(JSON.stringify({ type: "connected", message: "Agent OS WebSocket ready", timestamp: new Date().toISOString() }));

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      logger.info({ msg }, "WebSocket message received");

      // Broadcast to all clients
      const response = JSON.stringify({
        type: "command_received",
        data: msg,
        timestamp: new Date().toISOString(),
      });

      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(response);
        }
      });
    } catch (err) {
      logger.error({ err }, "Invalid WebSocket message");
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    logger.info({ clients: clients.size }, "WebSocket client disconnected");
  });

  ws.on("error", (err) => {
    logger.error({ err }, "WebSocket error");
    clients.delete(ws);
  });
});

// Export broadcast function for routes to use
export function broadcast(event: Record<string, unknown>) {
  const msg = JSON.stringify({ ...event, timestamp: new Date().toISOString() });
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port, wsPath: "/api/ws" }, "Agent OS server listening with WebSocket support");
});
