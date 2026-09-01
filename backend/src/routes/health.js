import { Router } from "express";
import { getStore } from "../store/index.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

healthRouter.get("/ready", async (_req, res) => {
  try {
    const ok = await getStore().ping();
    if (!ok) {
      res.status(503).json({ status: "not_ready" });
      return;
    }
    res.json({ status: "ready", store: getStore().kind });
  } catch {
    res.status(503).json({ status: "not_ready" });
  }
});
