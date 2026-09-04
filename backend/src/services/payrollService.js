import { randomUUID } from "node:crypto";
import { PAYROLL_OPERATOR_EMPLOYEE_IDS, ROLES } from "@twm/shared";
import { getStore } from "../store/index.js";
import { HttpError } from "../utils/httpError.js";
import { stripSalary } from "./scope.js";

// Who can see every employee's payslip. Everyone else only ever sees their own.
const PAYROLL_VIEW_ALL = new Set([ROLES.HR, ROLES.OWNER]);
// Who can create payslips or run payment: only these two people (accounting),
// not the whole HR/Admin/Owner role that otherwise has payroll read access.
const PAYROLL_OPERATORS = new Set(PAYROLL_OPERATOR_EMPLOYEE_IDS);

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
  const scoped =
    PAYROLL_VIEW_ALL.has(user.role) ? all : all.filter((p) => p.employeeId === employee?.id);
  return scoped.map((p) => stripSalary(p, user.role, employee?.id));
}

// No payroll is generated for these people (top of the house / co-founder level).
const EXCLUDED_FROM_PAYROLL = new Set(["emp-manoj", "emp-chai"]);

export async function createPayslip({ user, actorEmployeeId, employeeId, period, baseSalary, extras, requestId, ip }) {
  if (!PAYROLL_OPERATORS.has(actorEmployeeId)) {
    throw new HttpError(403, "Only Chai and Nagendra can create payslips");
  }
  const store = getStore();
  const emp = await store.getEmployeeById(employeeId);
  if (!emp) throw new HttpError(404, "Employee not found");
  if (EXCLUDED_FROM_PAYROLL.has(employeeId)) {
    throw new HttpError(422, "Payroll is not generated for this employee");
  }
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
    await store.writeAudit({
      actorUserId: user.id,
      action: "payslip.create",
      entity: "payslip",
      entityId: created.id,
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
  if (!PAYROLL_OPERATORS.has(actorEmployeeId)) {
    throw new HttpError(403, "Only Chai and Nagendra can delete payslips");
  }
  const store = getStore();
  const deleted = await store.deletePayslip(id);
  if (!deleted) throw new HttpError(404, "Payslip not found");
  await store.writeAudit({
    actorUserId: user.id,
    action: "payslip.delete",
    entity: "payslip",
    entityId: id,
    requestId,
    ip,
  });
}

export async function runPayment({ user, actorEmployeeId, idempotencyKey }) {
  if (!PAYROLL_OPERATORS.has(actorEmployeeId)) {
    throw new HttpError(403, "Only Chai and Nagendra can run payment");
  }
  const store = getStore();
  const existing = await store.findPaymentRunByKey(idempotencyKey);
  if (existing) return existing;
  return store.createPaymentRun({
    id: randomUUID(),
    idempotencyKey,
    status: "completed",
    createdBy: user.id,
  });
}
