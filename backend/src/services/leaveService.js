import { randomUUID } from "node:crypto";
import { LEAVE_ENTITLEMENT_LIST, LEAVE_ENTITLEMENTS, LEAVE_NOTICE_DAYS, LEAVE_TYPE_LABELS, LEAVE_TYPE_LIST, ROLES } from "@twm/shared";
import { getStore } from "../store/index.js";
import { HttpError } from "../utils/httpError.js";

// Leave approval is single-level: the applicant's designated approver
// (direct manager, or the sales-team override to the owner) makes the
// final decision — no escalation up the reporting line.

export function asYmd(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  // Format Date values in LOCAL time so they align with the calendar day
  // that was stored, avoiding UTC round-trip shifts from the DB driver.
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  return String(value).slice(0, 10);
}

// Whether an employee has an approved, full-day leave covering `ymd` — used
// to block clock-in. A half-day leave still allows clocking in/out for the
// rest of the day, regardless of leave type (sick, casual, or unpaid).
export async function isOnFullDayLeave(employeeId, ymd) {
  const rows = await getStore().listLeave();
  return rows.some(
    (row) =>
      row.employeeId === employeeId &&
      row.status === "approved" &&
      !row.halfDay &&
      asYmd(row.startDate) <= ymd &&
      asYmd(row.endDate) >= ymd,
  );
}

function daysUntil(startDate) {
  const start = new Date(`${asYmd(startDate)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((start.getTime() - today.getTime()) / 86400000);
}

export function assertLeaveWindow({ leaveType, startDate, endDate, enforceNotice }) {
  if (!LEAVE_TYPE_LIST.includes(leaveType)) {
    throw new HttpError(422, "Leave type must be sick, casual, or unpaid");
  }
  const start = asYmd(startDate);
  const end = asYmd(endDate);
  if (end < start) throw new HttpError(422, "End date must be on or after start date");
  const notice = LEAVE_NOTICE_DAYS[leaveType] || 0;
  if (enforceNotice && notice > 0 && daysUntil(start) < notice) {
    throw new HttpError(422, "Casual leave and unpaid leave must be applied at least 7 days in advance");
  }
}

function inclusiveDays(startDate, endDate) {
  const start = new Date(`${asYmd(startDate)}T00:00:00`);
  const end = new Date(`${asYmd(endDate)}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function overlapDays(startDate, endDate, year) {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const start = asYmd(startDate);
  const end = asYmd(endDate);
  const s = start > from ? start : from;
  const e = end < to ? end : to;
  if (e < s) return 0;
  return inclusiveDays(s, e);
}

// Days a leave consumes: full days, or 0.5 for a half-day single-day leave.
function daysConsumed(row, year) {
  const days = overlapDays(row.startDate, row.endDate, year);
  return row.halfDay ? 0.5 : days;
}

function isPending(status) {
  return String(status).startsWith("pending");
}

export function summarizeBalances(rows, year, entitlementRows = []) {
  const used = Object.fromEntries(LEAVE_ENTITLEMENT_LIST.map((t) => [t, 0]));
  const pending = Object.fromEntries(LEAVE_ENTITLEMENT_LIST.map((t) => [t, 0]));
  const allotted = { ...LEAVE_ENTITLEMENTS };
  for (const row of entitlementRows) {
    allotted[row.leaveType] = row.days;
  }
  for (const row of rows) {
    if (row.status === "rejected") continue;
    const days = daysConsumed(row, year);
    const leaveType = row.leaveType === "paid" ? "sick" : row.leaveType;
    if (!LEAVE_ENTITLEMENT_LIST.includes(leaveType)) continue;
    if (row.status === "approved") used[leaveType] += days;
    else if (isPending(row.status)) pending[leaveType] += days;
  }
  return LEAVE_ENTITLEMENT_LIST.map((leaveType) => {
    const cap = allotted[leaveType];
    const usedDays = used[leaveType];
    const pendingDays = pending[leaveType];
    return {
      leaveType,
      label: LEAVE_TYPE_LABELS[leaveType],
      allotted: cap,
      used: usedDays,
      pending: pendingDays,
      remaining: cap == null ? null : Math.max(0, cap - usedDays - pendingDays),
    };
  });
}

export async function getLeaveBalances({ employeeId, year }) {
  const store = getStore();
  const employee = await store.getEmployeeById(employeeId);
  if (!employee) throw new HttpError(404, "Employee not found");
  const rows = (await store.listLeave()).filter((row) => row.employeeId === employeeId);
  const entitlementRows = await store.getEntitlements(employeeId, year);
  return {
    year,
    employeeId,
    employeeName: employee.legalName,
    items: summarizeBalances(rows, year, entitlementRows),
  };
}

function quotaFromRows(rows) {
  const quota = {
    casual: LEAVE_ENTITLEMENTS.casual ?? 0,
    paid: LEAVE_ENTITLEMENTS.sick ?? 0,
  };
  for (const row of rows) {
    if (row.leaveType === "casual") quota.casual = row.days;
    if (row.leaveType === "sick" || row.leaveType === "paid") quota.paid = row.days;
  }
  return quota;
}

export async function listEntitlements(year) {
  const store = getStore();
  const employees = await store.listEmployees();
  const rows = await store.listEntitlements(year);
  return employees.map((employee) => ({
    employeeId: employee.id,
    employeeName: employee.legalName,
    year,
    ...quotaFromRows(rows.filter((row) => row.employeeId === employee.id)),
  }));
}

export async function saveEntitlements({ actor, employeeId, year, casual, paid, unpaid }) {
  const store = getStore();
  const employee = await store.getEmployeeById(employeeId);
  if (!employee) throw new HttpError(404, "Employee not found");
  const before = quotaFromRows(await store.getEntitlements(employeeId, year));
  const items = [
    { employeeId, year, leaveType: "casual", days: casual },
    { employeeId, year, leaveType: "sick", days: paid },
  ];
  await store.upsertEntitlements(employeeId, year, items);
  await store.writeAudit({
    actorUserId: actor.id,
    action: "leave.entitlements.update",
    entity: "leave_entitlements",
    entityId: employeeId,
    beforeJson: before,
    afterJson: { year, casual, paid, unpaid },
  });
  return { employeeId, employeeName: employee.legalName, year, casual, paid, unpaid };
}

async function assertHasBalance({ employeeId, leaveType, startDate, endDate, halfDay, ignoreId }) {
  const year = Number(asYmd(startDate).slice(0, 4));
  const store = getStore();
  const rows = (await store.listLeave()).filter((row) => row.employeeId === employeeId && row.id !== ignoreId);
  const entitlementRows = await store.getEntitlements(employeeId, year);
  const items = summarizeBalances(rows, year, entitlementRows);
  const type = leaveType === "paid" ? "sick" : leaveType;
  const item = items.find((i) => i.leaveType === type);
  if (!item || item.remaining == null) return;
  const need = halfDay ? 0.5 : overlapDays(startDate, endDate, year);
  if (item.remaining < need) {
    throw new HttpError(422, `Not enough ${LEAVE_TYPE_LABELS[type] || type} remaining`);
  }
}

// Half-day leaves are only valid for a single calendar day.
function assertHalfDay(halfDay, startDate, endDate) {
  if (halfDay && asYmd(startDate) !== asYmd(endDate)) {
    throw new HttpError(422, "Half day leave must be for a single day");
  }
}

export async function createLeaveRequest({ employee, leaveType, startDate, endDate, reason, halfDay = false }) {
  assertLeaveWindow({ leaveType, startDate, endDate, enforceNotice: true });
  assertHalfDay(halfDay, startDate, endDate);
  await assertHasBalance({ employeeId: employee.id, leaveType, startDate, endDate, halfDay });
  const store = getStore();
  // First approver: the sales team's leave goes straight to the owner
  // (leaveApproverId override); everyone else goes to their direct manager.
  // Team leads also go straight to the owner via their managerId.
  const approverId = employee.leaveApproverId || employee.managerId;
  if (!approverId) {
    // Top-level people (the owner) don't need approval — auto-approve.
    const row = {
      id: randomUUID(),
      employeeId: employee.id,
      leaveType,
      startDate: asYmd(startDate),
      endDate: asYmd(endDate),
      reason,
      halfDay: Boolean(halfDay),
      status: "approved",
    };
    return store.createLeave(row);
  }
  const row = {
    id: randomUUID(),
    employeeId: employee.id,
    leaveType,
    startDate: asYmd(startDate),
    endDate: asYmd(endDate),
    reason,
    halfDay: Boolean(halfDay),
    status: "pending",
    approverEmployeeId: approverId,
  };
  return store.createLeave(row);
}

export async function createManagedLeave({ actor, employeeId, leaveType, startDate, endDate, reason, status, halfDay = false }) {
  const store = getStore();
  const employee = await store.getEmployeeById(employeeId);
  if (!employee) throw new HttpError(404, "Employee not found");
  assertLeaveWindow({ leaveType, startDate, endDate, enforceNotice: false });
  assertHalfDay(halfDay, startDate, endDate);
  const row = {
    id: randomUUID(),
    employeeId,
    leaveType,
    startDate: asYmd(startDate),
    endDate: asYmd(endDate),
    reason: reason || null,
    halfDay: Boolean(halfDay),
    status: status || "approved",
    // Only unpaid leave logged through this admin-only route counts as LOP —
    // it's how HR records a day someone didn't show up, distinct from an
    // employee applying for unpaid leave themselves.
    isLop: leaveType === "unpaid",
  };
  const created = await store.createLeave(row);
  await store.writeAudit({
    actorUserId: actor.id,
    action: "leave.manage.create",
    entity: "leave_request",
    entityId: created.id,
    beforeJson: null,
    afterJson: { employeeId, leaveType, startDate: row.startDate, endDate: row.endDate, status: row.status, halfDay: row.halfDay },
  });
  return created;
}

export async function updateManagedLeave({ actor, leaveId, leaveType, startDate, endDate, reason, status, halfDay }) {
  const store = getStore();
  const existing = await store.getLeave(leaveId);
  if (!existing) throw new HttpError(404, "Leave request not found");
  // This route is only wired up for editing HR-logged LOP entries — editing
  // an employee's own submitted leave here would bypass the approval flow.
  if (!existing.isLop) throw new HttpError(422, "Only LOP entries can be edited here");
  assertLeaveWindow({ leaveType, startDate, endDate, enforceNotice: false });
  const next = {
    leaveType,
    startDate: asYmd(startDate),
    endDate: asYmd(endDate),
    reason: reason ?? existing.reason,
    halfDay: halfDay == null ? Boolean(existing.halfDay) : Boolean(halfDay),
    status: status || existing.status,
  };
  const updated = await store.updateLeave(leaveId, next);
  await store.writeAudit({
    actorUserId: actor.id,
    action: "leave.manage.update",
    entity: "leave_request",
    entityId: leaveId,
    beforeJson: {
      leaveType: existing.leaveType,
      startDate: asYmd(existing.startDate),
      endDate: asYmd(existing.endDate),
      status: existing.status,
      halfDay: Boolean(existing.halfDay),
    },
    afterJson: next,
  });
  return updated;
}

export async function deleteManagedLeave({ actor, leaveId }) {
  const store = getStore();
  const existing = await store.getLeave(leaveId);
  if (!existing) throw new HttpError(404, "Leave request not found");
  // Same restriction as edit: only ever remove an HR-logged LOP entry, never
  // an employee's own submitted (and possibly already-approved) request.
  if (!existing.isLop) throw new HttpError(422, "Only LOP entries can be deleted here");
  await store.deleteLeave(leaveId);
  await store.writeAudit({
    actorUserId: actor.id,
    action: "leave.manage.delete",
    entity: "leave_request",
    entityId: leaveId,
    beforeJson: {
      employeeId: existing.employeeId,
      leaveType: existing.leaveType,
      startDate: asYmd(existing.startDate),
      endDate: asYmd(existing.endDate),
      halfDay: Boolean(existing.halfDay),
      reason: existing.reason,
    },
    afterJson: null,
  });
}

export async function decideLeave({ user, leaveId, decision, comment }) {
  const store = getStore();
  const req = await store.getLeave(leaveId);
  if (!req) throw new HttpError(404, "Leave request not found");
  if (!["approved", "rejected"].includes(decision)) {
    throw new HttpError(422, "Decision must be approved or rejected");
  }
  if (!req.status?.startsWith("pending")) {
    throw new HttpError(409, "Leave is not awaiting a decision");
  }

  const candidate = await store.getEmployeeByUserId(user.id);
  const isOwner = user.role === ROLES.OWNER;
  // Only the current approver may decide.
  if (!isOwner && !(candidate && candidate.id === req.approverEmployeeId)) {
    throw new HttpError(403, "Not allowed to act on this request");
  }

  // Single-level approval: the approver's decision is final — no escalation
  // up the reporting line.
  const nextStatus = { status: decision === "rejected" ? "rejected" : "approved" };
  const approval = {
    id: randomUUID(),
    leaveRequestId: req.id,
    step: req.status,
    actorUserId: user.id,
    decision,
    comment: comment || null,
  };
  await store.addLeaveApproval(approval);
  const updated = await store.updateLeaveStatus(req.id, nextStatus.status, null);
  await store.writeAudit({
    actorUserId: user.id,
    action: `leave.${decision}`,
    entity: "leave_request",
    entityId: req.id,
    beforeJson: { status: req.status, approverEmployeeId: req.approverEmployeeId },
    afterJson: { status: nextStatus.status, approverEmployeeId: null },
  });
  return { leave: updated, approval };
}

export function visibleLeave(actorRole, actorEmployee, items, employeesById) {
  return items.filter((row) => {
    if (!actorEmployee) return actorRole === ROLES.OWNER || actorRole === ROLES.HR;
    // Your own requests are always visible.
    if (row.employeeId === actorEmployee.id) return true;
    // Requests you must act on (you are the current approver).
    if (row.status?.startsWith("pending") && row.approverEmployeeId === actorEmployee.id) return true;
    const target = employeesById.get(row.employeeId);
    if (!target) return false;
    if (actorRole === ROLES.OWNER || actorRole === ROLES.HR) return true;
    // Managers/leads see their reports' requests.
    if (target.managerId === actorEmployee.id) return true;
    if (actorRole === ROLES.TEAM_LEADER) return target.teamId === actorEmployee.teamId;
    if (actorRole === ROLES.MANAGER) return target.departmentId === actorEmployee.departmentId;
    return false;
  });
}
