import { randomUUID } from "node:crypto";
import { hasPermission, PERMISSIONS } from "@twm/shared";
import { getStore } from "../store/index.js";
import { HttpError } from "../utils/httpError.js";
import { stripSalary } from "./scope.js";
import { resolveActor } from "../utils/activityLog.js";

// PF / tax rule: ₹200 flat when gross pay reaches ₹25,000 or more.
const PF_TAX_AMOUNT = 200;
const PF_TAX_THRESHOLD = 25000;

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export function computePay({ baseSalary, extras }) {
  const baseAmount = round2(baseSalary);
  const lines = (extras ?? [])
    .filter((line) => round2(line.amount) !== 0)
    .map((line) => ({
      label: String(line.label).trim().slice(0, 120),
      amount: round2(line.amount),
    }));
  // Deduction lines (e.g. LOP) can't take gross below zero.
  const grossAmount = Math.max(0, round2(baseAmount + lines.reduce((sum, l) => sum + l.amount, 0)));
  const pfTax = grossAmount >= PF_TAX_THRESHOLD ? PF_TAX_AMOUNT : 0;
  const netAmount = round2(grossAmount - pfTax);
  return { baseAmount, extras: lines, grossAmount, pfTax, netAmount };
}

export async function listPayslips(user, employee) {
  const store = getStore();
  const all = await store.listPayslips();
  // Company-wide payroll access (HR and the owner) sees every payslip;
  // everyone else only ever sees their own.
  const scoped = hasPermission(user.role, PERMISSIONS.PAYROLL_WRITE_COMPANY)
    ? all
    : all.filter((p) => p.employeeId === employee?.id);
  return scoped.map((p) => stripSalary(p, user.role, employee?.id));
}

export async function createPayslip({ user, actorEmployeeId, employeeId, period, baseSalary, extras, requestId, ip }) {
  const store = getStore();
  const emp = await store.getEmployeeById(employeeId);
  if (!emp) throw new HttpError(404, "Employee not found");
  const pay = computePay({ baseSalary, extras });
  const row = {
    id: randomUUID(),
    employeeId,
    period,
    currency: "INR",
    ...pay,
    createdBy: user.id,
  };
  try {
    const created = await store.createPayslip(row);
    const actorEmp = await store.getEmployeeById(actorEmployeeId);
    const actorName = actorEmp?.legalName || user.email || user.id;
    await store.writeAudit({
      actorUserId: user.id,
      actorEmployeeId,
      actorName,
      action: "payslip.create",
      entity: "payslip",
      entityId: created.id,
      targetEmployeeId: employeeId,
      targetName: emp.legalName,
      summary: `${actorName} created a payslip for ${emp.legalName} (${period})`,
      afterJson: { employeeId, period, netAmount: created.netAmount },
      requestId,
      ip,
    });
    return created;
  } catch (err) {
    if (err.code === "DUPLICATE") throw new HttpError(409, err.message);
    throw err;
  }
}

export async function deletePayslip({ user, actorEmployeeId, id, requestId, ip }) {
  const store = getStore();
  const existing = await store.getPayslip(id);
  const deleted = await store.deletePayslip(id);
  if (!deleted) throw new HttpError(404, "Payslip not found");
  const [actorEmp, targetEmp] = await Promise.all([
    store.getEmployeeById(actorEmployeeId),
    existing ? store.getEmployeeById(existing.employeeId) : null,
  ]);
  const actorName = actorEmp?.legalName || user.email || user.id;
  const targetName = targetEmp?.legalName || "an employee";
  await store.writeAudit({
    actorUserId: user.id,
    actorEmployeeId,
    actorName,
    action: "payslip.delete",
    entity: "payslip",
    entityId: id,
    targetEmployeeId: existing?.employeeId ?? null,
    targetName,
    summary: `${actorName} deleted ${targetName}'s payslip${existing ? ` (${existing.period})` : ""}`,
    beforeJson: existing ? { employeeId: existing.employeeId, period: existing.period, netAmount: existing.netAmount } : null,
    requestId,
    ip,
  });
}

export async function runPayment({ user, actorEmployeeId, idempotencyKey }) {
  const store = getStore();
  const existing = await store.findPaymentRunByKey(idempotencyKey);
  if (existing) return existing;
  const created = await store.createPaymentRun({
    id: randomUUID(),
    idempotencyKey,
    status: "completed",
    createdBy: user.id,
  });
  // The idempotency key is "pay-<period>" by convention (see PayrollPage.jsx);
  // fall back gracefully if it isn't, rather than failing the payment run.
  const period = idempotencyKey.startsWith("pay-") ? idempotencyKey.slice(4) : null;
  const actorEmp = await store.getEmployeeById(actorEmployeeId);
  const actorName = actorEmp?.legalName || user.email || user.id;
  await store.writeAudit({
    actorUserId: user.id,
    actorEmployeeId,
    actorName,
    action: "payment.run",
    entity: "payment_run",
    entityId: created.id,
    summary: `${actorName} ran the payroll payment${period ? ` for ${period}` : ""}`,
    afterJson: { idempotencyKey, period },
  });
  return created;
}
