import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env, isProd } from "./config/env.js";
import { requestId } from "./middleware/requestId.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { employeesRouter, meRouter } from "./routes/employees.js";
import { leaveRouter } from "./routes/leave.js";
import { payrollRouter } from "./routes/payroll.js";
import { attendanceRouter } from "./routes/attendance.js";
import { calendarRouter } from "./routes/calendar.js";
import { activityRouter } from "./routes/activity.js";

// Supports root dist (where deployment builders like Hostinger expect build output)
// with fallback to frontend/dist.
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const rootDist = resolve(appRoot, "dist");
const nestedDist = resolve(appRoot, "frontend/dist");
const frontendDist = existsSync(rootDist) ? rootDist : nestedDist;

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(requestId);
  app.use(
    helmet({
      contentSecurityPolicy: isProd,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(compression());
  // Static frontend assets stay ahead of the rate limiter and JSON parser —
  // a page load's JS/CSS requests shouldn't eat into the API's per-minute
  // budget, and they don't carry a JSON body anyway.
  if (isProd) app.use(express.static(frontendDist));
  app.use(cookieParser());
  app.use(express.json({ limit: "64kb" }));
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use((req, res, next) => {
    req.setTimeout(15_000);
    res.setTimeout(15_000);
    next();
  });

  app.use(healthRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/me", meRouter);
  app.use("/api/v1/employees", employeesRouter);
  app.use("/api/v1/leave", leaveRouter);
  app.use("/api/v1/payroll", payrollRouter);
  app.use("/api/v1/attendance", attendanceRouter);
  app.use("/api/v1/calendar", calendarRouter);
  app.use("/api/v1/activity", activityRouter);

  if (isProd) {
    // SPA fallback: any unmatched non-API GET resolves to index.html so
    // client-side routing (react-router) can take over — a hard refresh or
    // direct link to e.g. /reset-password?token=... must still work.
    app.get(/^(?!\/(api|health|ready)).*/, (_req, res) => {
      res.sendFile(resolve(frontendDist, "index.html"));
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
