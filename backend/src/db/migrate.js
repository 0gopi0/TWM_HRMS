import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { env } from "../config/env.js";

const dir = dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  const conn = await mysql.createConnection({
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    multipleStatements: true,
  });
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const [rows] = await conn.query("SELECT id FROM schema_migrations WHERE id = ?", ["001_schema"]);
  if (rows.length === 0) {
    const sql = await readFile(resolve(dir, "../../sql/001_schema.sql"), "utf8");
    await conn.query(sql);
    await conn.query("INSERT INTO schema_migrations (id) VALUES (?)", ["001_schema"]);
  }
  const [att] = await conn.query("SELECT id FROM schema_migrations WHERE id = ?", ["002_attendance"]);
  if (att.length === 0) {
    const sql = await readFile(resolve(dir, "../../sql/002_attendance.sql"), "utf8");
    await conn.query(sql);
    await conn.query("INSERT INTO schema_migrations (id) VALUES (?)", ["002_attendance"]);
  }
  const [job] = await conn.query("SELECT id FROM schema_migrations WHERE id = ?", ["003_job_title"]);
  if (job.length === 0) {
    const sql = await readFile(resolve(dir, "../../sql/003_job_title.sql"), "utf8");
    await conn.query(sql);
    await conn.query("INSERT INTO schema_migrations (id) VALUES (?)", ["003_job_title"]);
  }
  const [cal] = await conn.query("SELECT id FROM schema_migrations WHERE id = ?", ["004_calendar"]);
  if (cal.length === 0) {
    const sql = await readFile(resolve(dir, "../../sql/004_calendar.sql"), "utf8");
    await conn.query(sql);
    await conn.query("INSERT INTO schema_migrations (id) VALUES (?)", ["004_calendar"]);
  }
  const [ent] = await conn.query("SELECT id FROM schema_migrations WHERE id = ?", ["005_leave_entitlements"]);
  if (ent.length === 0) {
    const sql = await readFile(resolve(dir, "../../sql/005_leave_entitlements.sql"), "utf8");
    await conn.query(sql);
    await conn.query("INSERT INTO schema_migrations (id) VALUES (?)", ["005_leave_entitlements"]);
  }
  const [apr] = await conn.query("SELECT id FROM schema_migrations WHERE id = ?", ["006_leave_approver"]);
  if (apr.length === 0) {
    const sql = await readFile(resolve(dir, "../../sql/006_leave_approver.sql"), "utf8");
    await conn.query(sql);
    await conn.query("INSERT INTO schema_migrations (id) VALUES (?)", ["006_leave_approver"]);
  }
  const [pay] = await conn.query("SELECT id FROM schema_migrations WHERE id = ?", ["007_payslip_items"]);
  if (pay.length === 0) {
    const sql = await readFile(resolve(dir, "../../sql/007_payslip_items.sql"), "utf8");
    await conn.query(sql);
    await conn.query("INSERT INTO schema_migrations (id) VALUES (?)", ["007_payslip_items"]);
  }
  const [pwr] = await conn.query("SELECT id FROM schema_migrations WHERE id = ?", ["008_password_reset"]);
  if (pwr.length === 0) {
    const sql = await readFile(resolve(dir, "../../sql/008_password_reset.sql"), "utf8");
    await conn.query(sql);
    await conn.query("INSERT INTO schema_migrations (id) VALUES (?)", ["008_password_reset"]);
  }
  const [lop] = await conn.query("SELECT id FROM schema_migrations WHERE id = ?", ["009_leave_lop"]);
  if (lop.length === 0) {
    const sql = await readFile(resolve(dir, "../../sql/009_leave_lop.sql"), "utf8");
    await conn.query(sql);
    await conn.query("INSERT INTO schema_migrations (id) VALUES (?)", ["009_leave_lop"]);
  }
  await conn.end();
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isCli) {
  migrate()
    .then(() => {
      console.log("Migration complete");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
