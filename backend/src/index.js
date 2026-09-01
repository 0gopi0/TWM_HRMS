import { createServer } from "node:http";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { initStore } from "./store/index.js";
import { closePool } from "./db/pool.js";

const app = createApp();
const server = createServer(app);


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
  server.listen(env.PORT, "127.0.0.1", () => {
    console.log(`API listening on http://127.0.0.1:${env.PORT}`);
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





