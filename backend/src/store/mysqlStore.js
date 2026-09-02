import { randomUUID } from "node:crypto";
import { getPool } from "../db/pool.js";
import { buildSeed, hashToken } from "./seedData.js";
import { migrate } from "../db/migrate.js";
import { ROLES } from "@twm/shared";

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role_code,
    isActive: Boolean(row.is_active),
    lastLoginAt: row.last_login_at,
  };
}

function mapEmployee(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    employeeNumber: row.employee_number,
    legalName: row.legal_name,
    jobTitle: row.job_title || null,
    departmentId: row.department_id,
    teamId: row.team_id,
    managerId: row.manager_id,
    leaveApproverId: row.leave_approver_id,
    employmentStatus: row.employment_status,
    // Only present when the query joins users (e.g. listEmployees) — lets
    // the frontend filter "who can be a leave approver" by seniority, and
    // pre-fill email on the edit form. The route strips email back out
    // before responding unless the requester can manage employees.
    role: row.role_code ?? undefined,
    email: row.email ?? undefined,
  };
}

export async function createMysqlStore() {
  await migrate();
  const pool = getPool();
  const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM users");
  if (n === 0) {
    const seed = await buildSeed();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const code of Object.values(ROLES)) {
        await conn.query("INSERT INTO roles (id, code, name) VALUES (?, ?, ?)", [
          randomUUID(),
          code,
          code,
        ]);
      }
      for (const d of seed.departments) {
        await conn.query("INSERT INTO departments (id, name) VALUES (?, ?)", [d.id, d.name]);
      }
      for (const u of seed.users) {
        await conn.query(
          "INSERT INTO users (id, email, password_hash, role_code, is_active) VALUES (?, ?, ?, ?, 1)",
          [u.id, u.email, u.passwordHash, u.role],
        );
      }
      for (const e of seed.employees) {
        await conn.query(
          `INSERT INTO employees (id, user_id, employee_number, legal_name, job_title, department_id, manager_id, leave_approver_id, employment_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [e.id, e.userId, e.employeeNumber, e.legalName, e.jobTitle || null, e.departmentId, e.managerId, e.leaveApproverId || null, e.employmentStatus],
        );
      }
      for (const t of seed.teams) {
        await conn.query(
          "INSERT INTO teams (id, name, department_id, leader_employee_id) VALUES (?, ?, ?, ?)",
          [t.id, t.name, t.departmentId, t.leaderEmployeeId],
        );
      }
      for (const e of seed.employees) {
        await conn.query("UPDATE employees SET team_id = ? WHERE id = ?", [e.teamId, e.id]);
      }
      for (const s of seed.salaries) {
        await conn.query(
          "INSERT INTO salary_structures (id, employee_id, currency, base_amount, effective_from) VALUES (?, ?, ?, ?, ?)",
          [s.id, s.employeeId, s.currency, s.baseAmount, s.effectiveFrom],
        );
      }
      for (const h of seed.holidays) {
        await conn.query(
          "INSERT INTO company_holidays (id, name, holiday_date, kind) VALUES (?, ?, ?, ?)",
          [h.id, h.name, h.date, h.kind],
        );
      }
      for (const l of seed.leaveRequests) {
        await conn.query(
          `INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, status, reason)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [l.id, l.employeeId, l.leaveType, l.startDate, l.endDate, l.status, l.reason || null],
        );
      }
      for (const e of seed.leaveEntitlements || []) {
        await conn.query(
          "INSERT INTO leave_entitlements (employee_id, year, leave_type, days) VALUES (?, ?, ?, ?)",
          [e.employeeId, e.year, e.leaveType, e.days],
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  return {
    kind: "mysql",
    async ping() {
      const [rows] = await pool.query("SELECT 1 AS ok");
      return rows[0]?.ok === 1;
    },
    async findUserByEmail(email) {
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email.toLowerCase()]);
      return mapUser(rows[0]);
    },
    async findUserById(id) {
      const [rows] = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
      return mapUser(rows[0]);
    },
    async touchLogin(userId) {
      await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [userId]);
    },
    async updateUserPassword(userId, passwordHash) {
      await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
    },
    async updateUserRole(userId, role) {
      await pool.query("UPDATE users SET role_code = ? WHERE id = ?", [role, userId]);
    },
    async updateUserEmail(userId, email) {
      try {
        await pool.query("UPDATE users SET email = ? WHERE id = ?", [email, userId]);
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
          const e = new Error("Email is already in use");
          e.code = "DUPLICATE_EMAIL";
          throw e;
        }
        throw err;
      }
    },
    async saveRefreshToken({ userId, token, expiresAt }) {
      await pool.query(
        "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
        [randomUUID(), userId, hashToken(token), expiresAt],
      );
    },
    async getRefreshToken(token) {
      const [rows] = await pool.query("SELECT * FROM refresh_tokens WHERE token_hash = ? LIMIT 1", [
        hashToken(token),
      ]);
      const row = rows[0];
      if (!row) return null;
      return {
        id: row.id,
        userId: row.user_id,
        expiresAt: row.expires_at,
        revokedAt: row.revoked_at,
      };
    },
    async revokeRefreshToken(token) {
      await pool.query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?", [hashToken(token)]);
    },
    async revokeAllRefreshTokens(userId) {
      await pool.query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL", [
        userId,
      ]);
    },
    // Requesting a new reset link invalidates any previous unused ones for
    // that user, so only the newest link a person requested ever works.
    async createPasswordResetToken({ id, userId, tokenHash, expiresAt }) {
      await pool.query("DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL", [userId]);
      await pool.query(
        "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
        [id, userId, tokenHash, expiresAt],
      );
    },
    async getPasswordResetToken(tokenHash) {
      const [rows] = await pool.query("SELECT * FROM password_reset_tokens WHERE token_hash = ? LIMIT 1", [
        tokenHash,
      ]);
      const r = rows[0];
      if (!r) return null;
      return { id: r.id, userId: r.user_id, expiresAt: r.expires_at, usedAt: r.used_at };
    },
    async markPasswordResetTokenUsed(tokenHash) {
      await pool.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = ?", [tokenHash]);
    },
    async listEmployees() {
      const [rows] = await pool.query(
        `SELECT e.*, u.role_code, u.email FROM employees e
         LEFT JOIN users u ON u.id = e.user_id
         ORDER BY e.employee_number`,
      );
      return rows.map(mapEmployee);
    },
    async getEmployeeById(id) {
      const [rows] = await pool.query("SELECT * FROM employees WHERE id = ? LIMIT 1", [id]);
      return mapEmployee(rows[0]);
    },
    async getEmployeeByUserId(userId) {
      const [rows] = await pool.query("SELECT * FROM employees WHERE user_id = ? LIMIT 1", [userId]);
      return mapEmployee(rows[0]);
    },
    async listDepartments() {
      const [rows] = await pool.query("SELECT id, name FROM departments ORDER BY name");
      return rows.map((r) => ({ id: r.id, name: r.name }));
    },
    async listTeams() {
      const [rows] = await pool.query("SELECT id, name, department_id, leader_employee_id FROM teams ORDER BY name");
      return rows.map((r) => ({ id: r.id, name: r.name, departmentId: r.department_id, leaderEmployeeId: r.leader_employee_id }));
    },
    // Provisions the login (users) and the HR record (employees) for a new
    // person in one transaction, so a duplicate email can't leave an
    // orphaned employee row (or vice versa).
    async createEmployeeWithUser({ user, employee }) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query(
          "INSERT INTO users (id, email, password_hash, role_code, is_active) VALUES (?, ?, ?, ?, 1)",
          [user.id, user.email, user.passwordHash, user.role],
        );
        await conn.query(
          `INSERT INTO employees
           (id, user_id, employee_number, legal_name, job_title, department_id, team_id, manager_id, leave_approver_id, employment_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            employee.id,
            user.id,
            employee.employeeNumber,
            employee.legalName,
            employee.jobTitle || null,
            employee.departmentId,
            employee.teamId || null,
            employee.managerId || null,
            employee.leaveApproverId || null,
            "active",
          ],
        );
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        if (err.code === "ER_DUP_ENTRY" && err.message.includes("email")) {
          const e = new Error("Email is already in use");
          e.code = "DUPLICATE_EMAIL";
          throw e;
        }
        throw err;
      } finally {
        conn.release();
      }
      return { ...employee, employmentStatus: "active" };
    },
    async updateEmployee(id, { legalName, jobTitle, departmentId, teamId, managerId, leaveApproverId }) {
      await pool.query(
        `UPDATE employees
         SET legal_name = ?, job_title = ?, department_id = ?, team_id = ?, manager_id = ?, leave_approver_id = ?
         WHERE id = ?`,
        [legalName, jobTitle || null, departmentId, teamId || null, managerId || null, leaveApproverId || null, id],
      );
    },
    async deleteEmployee(id) {
      const emp = await this.getEmployeeById(id);
      if (!emp) return false;
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query("DELETE FROM employees WHERE id = ?", [id]);
        if (emp.userId) {
          // Session artifacts, not business history — always safe to drop
          // so a stray login doesn't block deleting a mistaken hire.
          await conn.query("DELETE FROM refresh_tokens WHERE user_id = ?", [emp.userId]);
          await conn.query("DELETE FROM users WHERE id = ?", [emp.userId]);
        }
        await conn.commit();
        return true;
      } catch (err) {
        await conn.rollback();
        if (err.code === "ER_ROW_IS_REFERENCED_2" || err.code === "ER_ROW_IS_REFERENCED") {
          const e = new Error(
            "This person has related records (leave, attendance, payroll, audit history, or they're set as someone's manager/lead/approver) and can't be deleted",
          );
          e.code = "REFERENCED";
          throw e;
        }
        throw err;
      } finally {
        conn.release();
      }
    },
    async listLeave() {
      const [rows] = await pool.query("SELECT * FROM leave_requests ORDER BY created_at DESC");
      return rows.map((r) => ({
        id: r.id,
        employeeId: r.employee_id,
        leaveType: r.leave_type,
        startDate: r.start_date,
        endDate: r.end_date,
        status: r.status,
        approverEmployeeId: r.approver_employee_id,
        halfDay: Boolean(r.half_day),
        reason: r.reason,
        createdAt: r.created_at,
      }));
    },
    async getLeave(id) {
      const [rows] = await pool.query("SELECT * FROM leave_requests WHERE id = ? LIMIT 1", [id]);
      const r = rows[0];
      if (!r) return null;
      return {
        id: r.id,
        employeeId: r.employee_id,
        leaveType: r.leave_type,
        startDate: r.start_date,
        endDate: r.end_date,
        status: r.status,
        approverEmployeeId: r.approver_employee_id,
        halfDay: Boolean(r.half_day),
        reason: r.reason,
      };
    },
    async createLeave(row) {
      await pool.query(
        `INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, status, approver_employee_id, half_day, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.id, row.employeeId, row.leaveType, row.startDate, row.endDate, row.status, row.approverEmployeeId ?? null, row.halfDay ? 1 : 0, row.reason],
      );
      return row;
    },
    async updateLeaveStatus(id, status, approverEmployeeId) {
      await pool.query("UPDATE leave_requests SET status = ?, approver_employee_id = ? WHERE id = ?", [
        status,
        approverEmployeeId ?? null,
        id,
      ]);
      return this.getLeave(id);
    },
    async updateLeave(id, patch) {
      await pool.query(
        `UPDATE leave_requests
         SET leave_type = ?, start_date = ?, end_date = ?, reason = ?, status = ?, half_day = ?
         WHERE id = ?`,
        [patch.leaveType, patch.startDate, patch.endDate, patch.reason ?? null, patch.status, patch.halfDay ? 1 : 0, id],
      );
      return this.getLeave(id);
    },
    async addLeaveApproval(row) {
      await pool.query(
        `INSERT INTO leave_approvals (id, leave_request_id, step, actor_user_id, decision, comment)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [row.id, row.leaveRequestId, row.step, row.actorUserId, row.decision, row.comment],
      );
      return row;
    },
    async listApprovals(leaveId) {
      const [rows] = await pool.query("SELECT * FROM leave_approvals WHERE leave_request_id = ? ORDER BY created_at", [
        leaveId,
      ]);
      return rows.map((r) => ({
        id: r.id,
        leaveRequestId: r.leave_request_id,
        step: r.step,
        actorUserId: r.actor_user_id,
        decision: r.decision,
        comment: r.comment,
      }));
    },
    async currentSalary(employeeId) {
      const [rows] = await pool.query(
        "SELECT * FROM salary_structures WHERE employee_id = ? AND effective_to IS NULL LIMIT 1",
        [employeeId],
      );
      const r = rows[0];
      if (!r) return null;
      return {
        employeeId: r.employee_id,
        currency: r.currency,
        baseAmount: Number(r.base_amount),
      };
    },
    async listPayslips() {
      const [rows] = await pool.query("SELECT * FROM payslips ORDER BY period DESC");
      return rows.map((r) => ({
        id: r.id,
        employeeId: r.employee_id,
        period: r.period,
        currency: r.currency,
        baseAmount: Number(r.base_amount),
        grossAmount: Number(r.gross_amount),
        pfTax: Number(r.pf_tax),
        netAmount: Number(r.net_amount),
        extras: r.extras ? (typeof r.extras === "string" ? JSON.parse(r.extras) : r.extras) : [],
        createdBy: r.created_by,
      }));
    },
    async createPayslip(row) {
      try {
        await pool.query(
          `INSERT INTO payslips
           (id, employee_id, period, currency, base_amount, gross_amount, pf_tax, net_amount, extras, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id,
            row.employeeId,
            row.period,
            row.currency,
            row.baseAmount,
            row.grossAmount,
            row.pfTax,
            row.netAmount,
            JSON.stringify(row.extras ?? []),
            row.createdBy,
          ],
        );
        return row;
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
          const e = new Error("Payslip already exists for this period");
          e.code = "DUPLICATE";
          throw e;
        }
        throw err;
      }
    },
    async deletePayslip(id) {
      const [result] = await pool.query("DELETE FROM payslips WHERE id = ?", [id]);
      return result.affectedRows > 0;
    },
    async findPaymentRunByKey(key) {
      const [rows] = await pool.query("SELECT * FROM payment_runs WHERE idempotency_key = ? LIMIT 1", [key]);
      const r = rows[0];
      if (!r) return null;
      return { id: r.id, idempotencyKey: r.idempotency_key, status: r.status };
    },
    async createPaymentRun(row) {
      await pool.query(
        "INSERT INTO payment_runs (id, idempotency_key, status, created_by) VALUES (?, ?, ?, ?)",
        [row.id, row.idempotencyKey, row.status, row.createdBy],
      );
      return row;
    },
    async writeAudit(row) {
      await pool.query(
        `INSERT INTO audit_logs (id, actor_user_id, action, entity, entity_id, before_json, after_json, ip, request_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          row.actorUserId,
          row.action,
          row.entity,
          row.entityId,
          row.beforeJson ? JSON.stringify(row.beforeJson) : null,
          row.afterJson ? JSON.stringify(row.afterJson) : null,
          row.ip,
          row.requestId,
        ],
      );
    },
    async listAttendance(employeeId) {
      const [rows] = await pool.query(
        "SELECT * FROM attendance_entries WHERE employee_id = ? ORDER BY clock_in_at ASC",
        [employeeId],
      );
      return rows.map((r) => ({
        id: r.id,
        employeeId: r.employee_id,
        clockInAt: r.clock_in_at,
        clockOutAt: r.clock_out_at,
      }));
    },
    async listAllAttendance() {
      const [rows] = await pool.query("SELECT * FROM attendance_entries ORDER BY clock_in_at ASC");
      return rows.map((r) => ({
        id: r.id,
        employeeId: r.employee_id,
        clockInAt: r.clock_in_at,
        clockOutAt: r.clock_out_at,
      }));
    },
    async getOpenAttendance(employeeId) {
      const [rows] = await pool.query(
        "SELECT * FROM attendance_entries WHERE employee_id = ? AND clock_out_at IS NULL ORDER BY clock_in_at DESC LIMIT 1",
        [employeeId],
      );
      const r = rows[0];
      if (!r) return null;
      return {
        id: r.id,
        employeeId: r.employee_id,
        clockInAt: r.clock_in_at,
        clockOutAt: r.clock_out_at,
      };
    },
    async createAttendance(row) {
      await pool.query(
        "INSERT INTO attendance_entries (id, employee_id, clock_in_at, clock_out_at) VALUES (?, ?, ?, ?)",
        [row.id, row.employeeId, new Date(row.clockInAt), row.clockOutAt ? new Date(row.clockOutAt) : null],
      );
      return row;
    },
    async closeAttendance(id, clockOutAt) {
      await pool.query("UPDATE attendance_entries SET clock_out_at = ? WHERE id = ?", [new Date(clockOutAt), id]);
      const [rows] = await pool.query("SELECT * FROM attendance_entries WHERE id = ? LIMIT 1", [id]);
      const r = rows[0];
      if (!r) return null;
      return {
        id: r.id,
        employeeId: r.employee_id,
        clockInAt: r.clock_in_at,
        clockOutAt: r.clock_out_at,
      };
    },
    async listHolidays() {
      const [rows] = await pool.query("SELECT * FROM company_holidays ORDER BY holiday_date");
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        date: r.holiday_date,
        kind: r.kind,
      }));
    },
    async createHoliday(row) {
      try {
        await pool.query(
          "INSERT INTO company_holidays (id, name, holiday_date, kind) VALUES (?, ?, ?, ?)",
          [row.id, row.name, row.date, row.kind],
        );
        return row;
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
          const e = new Error("A holiday with this name already exists on that date");
          e.code = "DUPLICATE";
          throw e;
        }
        throw err;
      }
    },
    async listEntitlements(year) {
      const [rows] = year
        ? await pool.query("SELECT * FROM leave_entitlements WHERE year = ?", [year])
        : await pool.query("SELECT * FROM leave_entitlements");
      return rows.map((r) => ({
        employeeId: r.employee_id,
        year: r.year,
        leaveType: r.leave_type,
        days: Number(r.days),
      }));
    },
    async getEntitlements(employeeId, year) {
      const [rows] = await pool.query(
        "SELECT * FROM leave_entitlements WHERE employee_id = ? AND year = ?",
        [employeeId, year],
      );
      return rows.map((r) => ({
        employeeId: r.employee_id,
        year: r.year,
        leaveType: r.leave_type,
        days: Number(r.days),
      }));
    },
    async upsertEntitlements(employeeId, year, items) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query("DELETE FROM leave_entitlements WHERE employee_id = ? AND year = ?", [employeeId, year]);
        for (const row of items) {
          await conn.query(
            "INSERT INTO leave_entitlements (employee_id, year, leave_type, days) VALUES (?, ?, ?, ?)",
            [employeeId, year, row.leaveType, row.days],
          );
        }
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
      return this.getEntitlements(employeeId, year);
    },
  };
}
