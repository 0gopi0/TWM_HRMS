import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
// .env is the project's source of truth; override ambient vars (e.g. a shell
// or version manager exporting NODE_ENV=production) so local dev keeps the
// documented development defaults, including the memory-store fallback.
loadEnv({ path: resolve(root, ".env"), override: true });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_HOST: z.string().default("127.0.0.1"),
  DATABASE_PORT: z.coerce.number().int().default(3306),
  DATABASE_NAME: z.string().default("twm_hrms"),
  DATABASE_USER: z.string().default("twm_hrms_app"),
  DATABASE_PASSWORD: z.string().default(""),
  USE_MEMORY_STORE: z
    .string()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
