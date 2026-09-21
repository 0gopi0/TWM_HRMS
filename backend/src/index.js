import { createServer } from "node:http";
import { AUTO_CLOCKOUT_HOUR } from "@twm/shared";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { initStore } from "./store/index.js";
import { closePool } from "./db/pool.js";
import { purgeOldActivity } from "./services/activityLogService.js";
import { autoClockOutOpenEntries } from "./services/attendanceService.js";

const app = createApp();
const server = createServer(app);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
let purgeTimer;

function schedulePurge() {
  purgeOldActivity().catch((err) => console.error("Activity log purge failed:", err));
  purgeTimer = setInterval(() => {
    purgeOldActivity().catch((err) => console.error("Activity log purge failed:", err));
  }, ONE_DAY_MS);
  purgeTimer.unref();
}

// Milliseconds to the next AUTO_CLOCKOUT_HOUR on the local clock, so the job
// re-anchors to the wall clock each day instead of drifting the way a fixed
// 24-hour interval would.
function msUntilAutoClockOut(from = new Date()) {
  const next = new Date(from);
  next.setHours(AUTO_CLOCKOUT_HOUR, 0, 0, 0);
  if (next <= from) next.setDate(next.getDate() + 1);
  return next - from;
}

function runAutoClockOut() {
  autoClockOutOpenEntries()
    .then((closed) => {
      if (closed.length > 0) {
        console.log(`Auto clock-out closed ${closed.length} entr${closed.length === 1 ? "y" : "ies"}`);
      }
    })
    .catch((err) => console.error("Auto clock-out failed:", err));
}

// Clocks out anyone still clocked in at 10 PM, then again every 10 PM. Runs once
// at boot too: the host restarts the process on every deploy, and a restart at
// 10:30 PM would otherwise skip the whole night.
let autoClockOutTimer;

function scheduleAutoClockOut() {
  runAutoClockOut();
  const arm = () => {
    autoClockOutTimer = setTimeout(() => {
      runAutoClockOut();
      arm();
    }, msUntilAutoClockOut());
    autoClockOutTimer.unref();
  };
  arm();
}

// The timezone the whole app computes day boundaries in — worth seeing in the
// host logs, since "10 PM" and the attendance day both depend on it.
function timezoneLabel() {
  const offset = -new Date().getTimezoneOffset();
  const sign = offset < 0 ? "-" : "+";
  const abs = Math.abs(offset);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${Intl.DateTimeFormat().resolvedOptions().timeZone} (UTC${sign}${hh}:${mm})`;
}

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${env.PORT} is already in use. Stop the other API process, then retry.`,
    );
    process.exit(1);
  }
  throw err;
});

async function start() {
  await initStore();
  // Purge activity-log rows past the 2-month retention window once at boot,
  // then once a day — keeps the table bounded without needing a separate cron.
  schedulePurge();
  // "10 PM" and the attendance day both follow the pinned timezone (see
  // config/env.js), so log it — on the host this is the only place to see it.
  console.log(`Timezone ${timezoneLabel()} — auto clock-out at ${AUTO_CLOCKOUT_HOUR}:00`);
  scheduleAutoClockOut();
  server.listen(env.PORT, env.HOST, () => {
    console.log(`API listening on http://${env.HOST}:${env.PORT}`);
  });
}

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down`);
  server.close(async () => {
    await closePool().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start().catch((err) => {
  console.error(err);
  process.exit(1);
});





