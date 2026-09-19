import { Router, type IRouter } from "express";
import healthRouter from "./health";
import signupsRouter from "./signups";

const router: IRouter = Router();

router.use(healthRouter);
router.use(signupsRouter);

export default router;
