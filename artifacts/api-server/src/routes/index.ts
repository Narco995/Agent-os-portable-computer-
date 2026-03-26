import { Router, type IRouter } from "express";
import healthRouter from "./health";
import agentsRouter from "./agents";
import commandsRouter from "./commands";
import systemRouter from "./system";
import tasksRouter from "./tasks";
import filesRouter from "./files";
import memoryRouter from "./memory";
import codeRouter from "./code";
import openaiRouter from "./openai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(agentsRouter);
router.use(commandsRouter);
router.use(systemRouter);
router.use(tasksRouter);
router.use(filesRouter);
router.use(memoryRouter);
router.use(codeRouter);
router.use(openaiRouter);

export default router;
