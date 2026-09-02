import { randomUUID } from "node:crypto";
import { buildSeed, hashToken } from "./seedData.js";

export async function createMemoryStore() {
  const seed = await buildSeed();
  const users = new Map(seed.users.map((u) => [u.id, { ...u }]));
  const usersByEmail = new Map(seed.users.map((u) => [u.email, u.id]));
  const employees = new Map(seed.employees.map((e) => [e.id, { ...e }]));
  const refreshTokens = new Map();
  const passwordResetTokens = new Map();
  const leaveApprovals = [];
  const payslips = [];
  const paymentRuns = [];
  const auditLogs = [];
  const salaries = [...seed.salaries];
  const attendance = [];
  const departments = [...seed.departments];
  const teams = [...seed.teams];
  const holidays = [...seed.holidays];
  const leaveRequests = [...seed.leaveRequests];
  const leaveEntitlements = [...(seed.leaveEntitlements || [])];

  return {
    kind: "memory",
    async ping() {
      return true;
    },
    async findUserByEmail(email) {
      const id = usersByEmail.get(email.toLowerCase());
      return id ? users.get(id) : null;
    },
    async findUserById(id) {
      return users.get(id) ?? null;
    },
    async touchLogin(userId) {
      const u = users.get(userId);
      if (u) u.lastLoginAt = new Date().toISOString();
    },
    async updateUserPassword(userId, passwordHash) {
      const u = users.get(userId);
      if (u) u.passwordHash = passwordHash;
    },
    async updateUserRole(userId, role) {
      const u = users.get(userId);
      if (u) u.role = role;
    },
    async updateUserEmail(userId, email) {
      const u = users.get(userId);
      if (!u || u.email === email) return;
      if (usersByEmail.has(email)) {
        const e = new Error("Email is already in use");
        e.code = "DUPLICATE_EMAIL";
        throw e;
      }
      usersByEmail.delete(u.email);
      u.email = email;
      usersByEmail.set(email, userId);
    },
    async saveRefreshToken({ userId, token, expiresAt }) {
      const id = randomUUID();
      refreshTokens.set(hashToken(token), {
        id,
        userId,
        expiresAt,
        revokedAt: null,
      });
    },
    async getRefreshToken(token) {
      return refreshTokens.get(hashToken(token)) ?? null;
    },
    async revokeRefreshToken(token) {
      const row = refreshTokens.get(hashToken(token));
      if (row) row.revokedAt = new Date().toISOString();
    },
    async revokeAllRefreshTokens(userId) {
      for (const row of refreshTokens.values()) {
        if (row.userId === userId) row.revokedAt = new Date().toISOString();
      }
    },
    async createPasswordResetToken({ id, userId, tokenHash, expiresAt }) {
      for (const row of passwordResetTokens.values()) {
        if (row.userId === userId && !row.usedAt) passwordResetTokens.delete(row.tokenHash);
      }
      passwordResetTokens.set(tokenHash, { id, userId, tokenHash, expiresAt, usedAt: null });
    },
    async getPasswordResetToken(tokenHash) {
      return passwordResetTokens.get(tokenHash) ?? null;
    },
    async markPasswordResetTokenUsed(tokenHash) {
      const row = passwordResetTokens.get(tokenHash);
      if (row) row.usedAt = new Date().toISOString();
    },
    async listEmployees() {
      return [...employees.values()].map((e) => ({
        ...e,
        role: users.get(e.userId)?.role,
        email: users.get(e.userId)?.email,
      }));
    },
    async getEmployeeById(id) {
      return employees.get(id) ?? null;
    },
    async getEmployeeByUserId(userId) {
      return [...employees.values()].find((e) => e.userId === userId) ?? null;
    },
    async listDepartments() {
      return departments.map((d) => ({ ...d }));
    },
    async listTeams() {
      return teams.map((t) => ({ ...t }));
    },
    async createEmployeeWithUser({ user, employee }) {
      if (usersByEmail.has(user.email)) {
        const e = new Error("Email is already in use");
        e.code = "DUPLICATE_EMAIL";
        throw e;
      }
      users.set(user.id, { ...user });
      usersByEmail.set(user.email, user.id);
      const row = { ...employee, userId: user.id, employmentStatus: "active" };
      employees.set(employee.id, row);
      return row;
    },
    async updateEmployee(id, updates) {
      const emp = employees.get(id);
      if (!emp) return null;
      Object.assign(emp, updates);
      return emp;
    },
    async deleteEmployee(id) {
      const emp = employees.get(id);
      if (!emp) return false;
      const referenced = [...employees.values()].some(
        (e) => e.id !== id && (e.managerId === id || e.leaveApproverId === id),
      );
      if (referenced) {
        const e = new Error("This person is referenced elsewhere (a manager, team lead, or leave approver) and can't be deleted");
        e.code = "REFERENCED";
        throw e;
      }
      employees.delete(id);
      if (emp.userId) {
        for (const [key, row] of refreshTokens) {
          if (row.userId === emp.userId) refreshTokens.delete(key);
        }
        const user = users.get(emp.userId);
        users.delete(emp.userId);
        if (user) usersByEmail.delete(user.email);
      }
      return true;
    },
    async listLeave() {
      return [...leaveRequests];
    },
    async getLeave(id) {
      return leaveRequests.find((r) => r.id === id) ?? null;
    },
    async createLeave(row) {
      leaveRequests.push(row);
      return row;
    },
    async updateLeaveStatus(id, status, approverEmployeeId) {
      const row = leaveRequests.find((r) => r.id === id);
      if (row) {
        row.status = status;
        if (approverEmployeeId !== undefined) row.approverEmployeeId = approverEmployeeId ?? null;
      }
      return row;
    },
    async updateLeave(id, patch) {
      const row = leaveRequests.find((r) => r.id === id);
      if (!row) return null;
      Object.assign(row, patch);
      return row;
    },
    async addLeaveApproval(row) {
      leaveApprovals.push(row);
      return row;
    },
    async listApprovals(leaveId) {
      return leaveApprovals.filter((a) => a.leaveRequestId === leaveId);
    },
    async currentSalary(employeeId) {
      return salaries.find((s) => s.employeeId === employeeId && !s.effectiveTo) ?? null;
    },
    async listPayslips() {
      return [...payslips];
    },
    async createPayslip(row) {
      if (payslips.some((p) => p.employeeId === row.employeeId && p.period === row.period)) {
        const err = new Error("Payslip already exists for this period");
        err.code = "DUPLICATE";
        throw err;
      }
      payslips.push(row);
      return row;
    },
    async deletePayslip(id) {
      const idx = payslips.findIndex((p) => p.id === id);
      if (idx === -1) return false;
      payslips.splice(idx, 1);
      return true;
    },
    async findPaymentRunByKey(key) {
      return paymentRuns.find((r) => r.idempotencyKey === key) ?? null;
    },
    async createPaymentRun(row) {
      paymentRuns.push(row);
      return row;
    },
    async writeAudit(row) {
      auditLogs.push({ id: randomUUID(), createdAt: new Date().toISOString(), ...row });
    },
    async listAttendance(employeeId) {
      return attendance
        .filter((a) => a.employeeId === employeeId)
        .sort((a, b) => String(a.clockInAt).localeCompare(String(b.clockInAt)));
    },
    async listAllAttendance() {
      return [...attendance];
    },
    async getOpenAttendance(employeeId) {
      const rows = await this.listAttendance(employeeId);
      return rows.find((a) => !a.clockOutAt) ?? null;
    },
    async createAttendance(row) {
      attendance.push({ ...row });
      return row;
    },
    async closeAttendance(id, clockOutAt) {
      const row = attendance.find((a) => a.id === id);
      if (row) row.clockOutAt = clockOutAt;
      return row ?? null;
    },
    async listHolidays() {
      return [...holidays];
    },
    async createHoliday(row) {
      if (holidays.some((h) => h.date === row.date && h.name.toLowerCase() === row.name.toLowerCase())) {
        const err = new Error("A holiday with this name already exists on that date");
        err.code = "DUPLICATE";
        throw err;
      }
      holidays.push({ ...row });
      return row;
    },
    async listEntitlements(year) {
      return leaveEntitlements.filter((row) => !year || row.year === year).map((row) => ({ ...row }));
    },
    async getEntitlements(employeeId, year) {
      return leaveEntitlements.filter((row) => row.employeeId === employeeId && row.year === year).map((row) => ({ ...row }));
    },
    async upsertEntitlements(employeeId, year, items) {
      const kept = leaveEntitlements.filter((row) => !(row.employeeId === employeeId && row.year === year));
      leaveEntitlements.length = 0;
      leaveEntitlements.push(...kept, ...items.map((row) => ({ ...row, employeeId, year })));
      return leaveEntitlements.filter((row) => row.employeeId === employeeId && row.year === year);
    },
  };
}
