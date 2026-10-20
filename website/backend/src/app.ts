import express from "express";
import cors from "cors";
import APIv1 from "./routes/api/v1/index";
import logger from "./utils/logger";

export const createApp = (): express.Express => {
  const app = express();

  app.use(cors({
    origin: process.env.NODE_ENV === "production"
      ? process.env.FRONTEND_ORIGIN
      : ["http://localhost:5173", "http://127.0.0.1:5173"],
  }));
  app.use(express.json());
  app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logger.info({
        request: {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: Number(durationMs.toFixed(2)),
          userId: req.user?.id,
          role: req.user?.role,
        },
      }, "HTTP request completed");
    });
    next();
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/v1", APIv1);

  app.use((req, res, next) => {
    res.status(404).send({ code: 404, message: "Not Found" });
    logger.warn({ method: req.method, url: req.originalUrl }, "Route not found");
    next();
  });

  app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    logger.error({ err: error, method: req.method, url: req.originalUrl }, "Unhandled HTTP error");
    res.status(500).json({ message: "Internal server error" });
  });

  return app;
};
