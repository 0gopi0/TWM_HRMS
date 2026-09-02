import { env, isProd } from "../config/env.js";
import { createMemoryStore } from "./memoryStore.js";
import { createMysqlStore } from "./mysqlStore.js";

let store;

export async function initStore() {
  if (env.USE_MEMORY_STORE) {
    store = await createMemoryStore();
    console.warn("Using in-memory store (USE_MEMORY_STORE=true). Data resets on restart.");
    return store;
  }
  try {
    store = await createMysqlStore();
    console.log("Connected to MySQL and ready.");
    return store;
  } catch (err) {
    if (isProd) throw err;
    console.warn("MySQL unavailable, falling back to memory store:", err.message);
    store = await createMemoryStore();
    return store;
  }
}

export function getStore() {
  if (!store) throw new Error("Store not initialized");
  return store;
}
