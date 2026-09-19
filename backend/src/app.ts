import { fileURLToPath } from "node:url";
import { config } from "dotenv";

config({
  path: [
    fileURLToPath(new URL("../.env", import.meta.url)),
    fileURLToPath(new URL("../../COMET.env", import.meta.url)),
  ],
});

import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { connectToDatabase } from "./lib/mongodb";

const app: Express = express();

const allowedOrigins = new Set(
  [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "https://comet-mnl4.onrender.com",
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN,
  ].filter((value): value is string => Boolean(value)),
);

const corsOptions = {
  origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = origin.replace(/\/$/, "");

    if (allowedOrigins.has(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    logger.warn({ origin, allowedOrigins: [...allowedOrigins] }, "Rejected CORS origin");
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

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
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database connection
connectToDatabase().catch((error) => {
  logger.error({ error }, "Failed to initialize database");
  process.exit(1);
});

app.use("/api", router);

export default app;
