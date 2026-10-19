import express from "express";
import cors from "cors";
import APIv1 from "./routes/api/v1/index";

export const createApp = (): express.Express => {
  const app = express();

  app.use(cors({
    origin: process.env.NODE_ENV === "production"
      ? process.env.FRONTEND_ORIGIN
      : ["http://localhost:5173", "http://127.0.0.1:5173"],
  }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/v1", APIv1);

  app.use((req, res, next) => {
    res.status(404).send({ code: 404, message: "Not Found" });
    console.log(`Request: ${req.method} ${req.url}`);
    next();
  });

  return app;
};
