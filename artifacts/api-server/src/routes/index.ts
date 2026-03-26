import { Router, type IRouter } from "express";
import healthRouter from "./health";
import agentsRouter from "./agents";
import commandsRouter from "./commands";
import systemRouter from "./system";
import tasksRouter from "./tasks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(agentsRouter);
router.use(commandsRouter);
router.use(systemRouter);
router.use(tasksRouter);

export default router;
