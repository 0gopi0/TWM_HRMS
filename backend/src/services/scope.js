import { ROLES } from "@twm/shared";
import { HttpError } from "../utils/httpError.js";

export function canSeeEmployee(actorEmployee, actorRole, target) {
  if (!target) return false;
  if (actorRole === ROLES.OWNER || actorRole === ROLES.HR || actorRole === ROLES.ADMIN) return true;
  if (!actorEmployee) return false;
  if (target.id === actorEmployee.id) return true;
  // Direct reports are visible to their manager/lead.
  if (target.managerId === actorEmployee.id) return true;
  if (actorRole === ROLES.TEAM_LEADER) return target.teamId === actorEmployee.teamId;
  if (actorRole === ROLES.MANAGER) return target.departmentId === actorEmployee.departmentId;
  return false;
}

export function assertCanSeeEmployee(req, target) {
  if (!canSeeEmployee(req.employee, req.user.role, target)) {
    throw new HttpError(404, "Employee not found");
  }
}

export function stripSalary(payslip, actorRole, actorEmployeeId) {
  const own = payslip.employeeId === actorEmployeeId;
  if (actorRole === ROLES.HR || actorRole === ROLES.ADMIN || actorRole === ROLES.OWNER || own) return payslip;
  const { baseAmount, grossAmount, pfTax, netAmount, extras, ...rest } = payslip;
  return rest;
}
