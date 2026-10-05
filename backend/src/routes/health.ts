import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getDatabase } from "../lib/mongodb";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  try {
    // Verify database connection is healthy
    const db = getDatabase();
    await db.admin().ping();

    const data = HealthCheckResponse.parse({ status: "ok" });
    res.status(200).json(data);
  } catch (error) {
    logger.error({ error }, "Health check failed");
    res.status(503).json({ status: "degraded", error: "Database connection issue" });
  }
});

export default router;
