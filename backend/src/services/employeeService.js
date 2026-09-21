import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { ASSIGNABLE_ROLES } from "@twm/shared";
import { getStore } from "../store/index.js";
import { HttpError } from "../utils/httpError.js";
import { resolveActor } from "../utils/activityLog.js";

const EMPLOYEE_NUMBER_PREFIX = "TWM-";

function nextEmployeeNumber(employees) {
  let max = 1000;
  for (const e of employees) {
    const n = Number(String(e.employeeNumber || "").slice(EMPLOYEE_NUMBER_PREFIX.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${EMPLOYEE_NUMBER_PREFIX}${max + 1}`;
}

// "Reports to" is a single choice: a person (typically a team leader in the
// same department), or the top of the org chart. Picking someone who leads a
// team also joins that team, so the two can't drift out of sync.
//
// Reporting to someone with no team row of their own is allowed — a
// department can have more than one lead, and only one of them is the leader
// of the team the seeder created. The manager link carries the relationship
// and team_id stays null; direct reports remain visible to them either way.
// Shared by create and update so the rule can't diverge between the two paths.
async function resolveReportsTo({ store, departmentId, teamId, managerId, selfId }) {
  let resolvedManagerId = null;
  if (teamId) {
    const teams = await store.listTeams();
    const team = teams.find((t) => t.id === teamId);
    if (!team) throw new HttpError(422, "Team not found");
    if (team.departmentId !== departmentId) {
      throw new HttpError(422, "Team does not belong to the selected department");
    }
    if (managerId && managerId !== team.leaderEmployeeId) {
      throw new HttpError(422, "Manager must be that team's leader");
    }
    resolvedManagerId = team.leaderEmployeeId || managerId || null;
  } else if (managerId) {
    const manager = await store.getEmployeeById(managerId);
    if (!manager) throw new HttpError(422, "Manager not found");
    resolvedManagerId = managerId;
  }
  if (selfId && resolvedManagerId === selfId) {
    throw new HttpError(422, "Someone can't report to themselves");
  }
  return resolvedManagerId;
}

export async function listDepartments() {
  return getStore().listDepartments();
}

export async function listTeams() {
  return getStore().listTeams();
}

export async function createEmployee({
  actorUser,
  email,
  password,
  legalName,
  jobTitle,
  role,
  departmentId,
  teamId,
  managerId,
  leaveApproverId,
  requestId,
  ip,
}) {
  const store = getStore();

  const existing = await store.findUserByEmail(email);
  if (existing) throw new HttpError(409, "Email is already in use");

  const departments = await store.listDepartments();
  if (!departments.some((d) => d.id === departmentId)) {
    throw new HttpError(422, "Department not found");
  }

  const resolvedManagerId = await resolveReportsTo({ store, departmentId, teamId, managerId });

  if (leaveApproverId) {
    const approver = await store.getEmployeeById(leaveApproverId);
    if (!approver) throw new HttpError(422, "Leave approver not found");
  }

  const employees = await store.listEmployees();
  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    id: randomUUID(),
    email: email.trim().toLowerCase(),
    passwordHash,
    role,
  };
  const employee = {
    id: randomUUID(),
    employeeNumber: nextEmployeeNumber(employees),
    legalName: legalName.trim(),
    jobTitle: jobTitle?.trim() || null,
    departmentId,
    teamId: teamId || null,
    managerId: resolvedManagerId,
    leaveApproverId: leaveApproverId || null,
  };

  let created;
  try {
    created = await store.createEmployeeWithUser({ user, employee });
  } catch (err) {
    if (err.code === "DUPLICATE_EMAIL") throw new HttpError(409, err.message);
    throw err;
  }

  const actor = await resolveActor(actorUser);
  await store.writeAudit({
    actorUserId: actorUser.id,
    actorEmployeeId: actor.employeeId,
    actorName: actor.name,
    action: "employee.create",
    entity: "employee",
    entityId: created.id,
    targetEmployeeId: created.id,
    targetName: employee.legalName,
    summary: `${actor.name} added ${employee.legalName} as a new employee`,
    afterJson: { email: user.email, legalName: employee.legalName, role, departmentId, teamId },
    requestId,
    ip,
  });

  return { ...created, userId: user.id };
}

// Full-replace, not a partial patch: the caller (the edit form) always
// resubmits every field it owns, same as createEmployee. An omitted
// jobTitle/leaveApproverId is treated as "cleared", not "unchanged" — the
// frontend must pre-fill the whole form from the current record.
export async function updateEmployee({
  actorUser,
  id,
  legalName,
  employeeNumber,
  email,
  jobTitle,
  role,
  departmentId,
  teamId,
  managerId,
  leaveApproverId,
  requestId,
  ip,
}) {
  const store = getStore();

  const existing = await store.getEmployeeById(id);
  if (!existing) throw new HttpError(404, "Employee not found");

  const departments = await store.listDepartments();
  if (!departments.some((d) => d.id === departmentId)) {
    throw new HttpError(422, "Department not found");
  }

  const resolvedManagerId = await resolveReportsTo({
    store,
    departmentId,
    teamId,
    managerId,
    selfId: id,
  });

  if (leaveApproverId) {
    if (leaveApproverId === id) throw new HttpError(422, "Someone can't approve their own leave");
    const approver = await store.getEmployeeById(leaveApproverId);
    if (!approver) throw new HttpError(422, "Leave approver not found");
  }

  const currentUser = existing.userId ? await store.findUserById(existing.userId) : null;

  // Owner/Admin/Manager aren't hand-out-able from this form (same rule as
  // creating someone) — only touch the role if it's actually changing, so
  // editing an owner/admin's other details doesn't require also resubmitting
  // a role the form was never allowed to offer for them.
  let roleChanged = false;
  if (role && currentUser && currentUser.role !== role) {
    if (!ASSIGNABLE_ROLES.includes(role)) {
      throw new HttpError(422, "That role can't be assigned from this form");
    }
    roleChanged = true;
  }

  const emailChanged = Boolean(email && currentUser && currentUser.email !== email);

  const updates = {
    legalName: legalName.trim(),
    employeeNumber: employeeNumber.trim(),
    jobTitle: jobTitle?.trim() || null,
    departmentId,
    teamId: teamId || null,
    managerId: resolvedManagerId,
    leaveApproverId: leaveApproverId || null,
  };
  if (emailChanged) {
    try {
      await store.updateUserEmail(existing.userId, email);
    } catch (err) {
      if (err.code === "DUPLICATE_EMAIL") throw new HttpError(409, err.message);
      throw err;
    }
  }
  try {
    await store.updateEmployee(id, updates);
  } catch (err) {
    if (err.code === "DUPLICATE_EMPLOYEE_NUMBER") throw new HttpError(409, err.message);
    throw err;
  }
  if (roleChanged) await store.updateUserRole(existing.userId, role);

  const actor = await resolveActor(actorUser);
  const numberChanged = updates.employeeNumber !== existing.employeeNumber;
  const changedBits = [];
  if (numberChanged) changedBits.push("ID number");
  if (roleChanged) changedBits.push(`role to ${role}`);
  if (emailChanged) changedBits.push("email");
  const summary = changedBits.length
    ? `${actor.name} updated ${updates.legalName}'s ${changedBits.join(" and ")}`
    : `${actor.name} updated ${updates.legalName}'s profile`;
  await store.writeAudit({
    actorUserId: actorUser.id,
    actorEmployeeId: actor.employeeId,
    actorName: actor.name,
    action: "employee.update",
    entity: "employee",
    entityId: id,
    targetEmployeeId: id,
    targetName: updates.legalName,
    summary,
    beforeJson: {
      legalName: existing.legalName,
      employeeNumber: existing.employeeNumber,
      email: currentUser?.email,
      jobTitle: existing.jobTitle,
      departmentId: existing.departmentId,
      teamId: existing.teamId,
      managerId: existing.managerId,
      leaveApproverId: existing.leaveApproverId,
    },
    afterJson: {
      ...updates,
      email: emailChanged ? email : undefined,
      role: roleChanged ? role : undefined,
    },
    requestId,
    ip,
  });

  return { ...existing, ...updates, email: emailChanged ? email : currentUser?.email };
}

// Removing someone always erases their own HR data — leave requests and
// balance, attendance, salary history, payslips — and clears any reporting
// line, team lead or leave-approver reference that pointed at them (see
// store.deleteEmployee). The employee row itself is deactivated instead of
// deleted only when it can't be, because they acted on someone ELSE's
// record (approved a teammate's leave, ran a payment run, issued a payslip)
// and that action's audit trail isn't this person's data to remove.
export async function deleteEmployee({ actorUser, id, requestId, ip }) {
  const store = getStore();
  const emp = await store.getEmployeeById(id);
  if (!emp) throw new HttpError(404, "Employee not found");

  const actor = await resolveActor(actorUser);
  // Someone who can remove people could otherwise lock themselves out of the
  // app with one click — there's no way back in to undo it.
  if (actor.employeeId && actor.employeeId === id) {
    throw new HttpError(422, "You can't remove your own account");
  }

  let outcome = "deleted";
  try {
    const deleted = await store.deleteEmployee(id);
    if (!deleted) throw new HttpError(404, "Employee not found");
  } catch (err) {
    if (err.code !== "REFERENCED") throw err;
    await store.deactivateEmployee(id);
    outcome = "deactivated";
  }

  await store.writeAudit({
    actorUserId: actorUser.id,
    actorEmployeeId: actor.employeeId,
    actorName: actor.name,
    action: outcome === "deleted" ? "employee.delete" : "employee.deactivate",
    entity: "employee",
    entityId: id,
    targetEmployeeId: id,
    targetName: emp.legalName,
    summary:
      outcome === "deleted"
        ? `${actor.name} removed ${emp.legalName} from the directory`
        : `${actor.name} deactivated ${emp.legalName} — login disabled, their leave/attendance/pay records erased, approval history kept`,
    beforeJson: { employeeNumber: emp.employeeNumber, legalName: emp.legalName },
    requestId,
    ip,
  });
  return { outcome };
}

// Undoes a deactivation: they are back in the directory and their login works
// again. (Someone who was hard-deleted is gone for good — there's nothing to
// restore.)
export async function restoreEmployee({ actorUser, id, requestId, ip }) {
  const store = getStore();
  const emp = await store.getEmployeeById(id);
  if (!emp) throw new HttpError(404, "Employee not found");

  const restored = await store.restoreEmployee(id);
  if (!restored) throw new HttpError(404, "Employee not found");

  const actor = await resolveActor(actorUser);
  await store.writeAudit({
    actorUserId: actorUser.id,
    actorEmployeeId: actor.employeeId,
    actorName: actor.name,
    action: "employee.restore",
    entity: "employee",
    entityId: id,
    targetEmployeeId: id,
    targetName: emp.legalName,
    summary: `${actor.name} restored ${emp.legalName} to the directory`,
    requestId,
    ip,
  });
  return { ...emp, employmentStatus: "active" };
}
