import mysql from "mysql2/promise";
import { env } from "../config/env.js";

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT,
      user: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      database: env.DATABASE_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60_000,
      enableKeepAlive: true,
      namedPlaceholders: true,
    });
  }
  return pool;
}

export async function pingDb() {
  const [rows] = await getPool().query("SELECT 1 AS ok");
  return rows[0]?.ok === 1;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
