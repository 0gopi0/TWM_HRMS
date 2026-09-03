import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
// In development, .env is the project's source of truth — override ambient
// vars (e.g. a shell or version manager exporting NODE_ENV=production) so
// local dev keeps the documented defaults, including the memory-store
// fallback. In production, do the opposite: many Node hosts (Hostinger's
// app manager included) inject PORT and other vars into the real
// environment at startup, and a committed-shaped .env sitting on the server
// must never be able to clobber those — so there, .env only fills in
// whatever the platform didn't already set.
const nodeEnvBeforeDotenv = process.env.NODE_ENV || "development";
loadEnv({ path: resolve(root, ".env"), override: nodeEnvBeforeDotenv !== "production" });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default(() => (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1")),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_HOST: z.string().default("127.0.0.1"),
  DATABASE_PORT: z.coerce.number().int().default(3306),
  DATABASE_NAME: z.string().default("u435860618_hrms"),
  DATABASE_USER: z.string().default("u435860618_bnghrms"),
  DATABASE_PASSWORD: z.string().default(""),
  USE_MEMORY_STORE: z
    .string()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  JWT_ACCESS_SECRET: z.string().min(16).default("d4e7cefe6b55b00070a59b56812141ab9bb8533d55eb7dc1e8da84f9656649f3"),
  JWT_REFRESH_SECRET: z.string().min(16).default("35cdc93263a1117f16363c6eac4060453365fb31e296fc1b1f52fc9418b29a0b"),
  ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  // Hostinger Business mailbox (hPanel > Emails > Mailboxes > Connect apps &
  // devices) — SMTP_USER must be the full mailbox address on the sending
  // domain, and SMTP_FROM should match it (or be omitted to default to it).
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: z
    .string()
    .default("true")
    .transform((v) => v === "true" || v === "1"),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z
    .string()
    .default("")
    .transform((val) => val || process.env.SMTP_PASSWORD || ""),
  SMTP_FROM: z.string().default(""),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
