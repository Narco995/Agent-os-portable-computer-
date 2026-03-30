import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// artifacts/api-server/dist/ → ../../ → artifacts/ → agent-os/dist/public
const STATIC_DIR = path.resolve(__dirname, "../../agent-os/dist/public");

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ── Static frontend (Railway-only mode) ──────────────────────────────────────
app.use(express.static(STATIC_DIR));

// SPA fallback — all non-/api routes return index.html
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, "index.html"));
});

export default app;
