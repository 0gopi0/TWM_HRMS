import {
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_TYPES,
  LEAVE_CREDIT_START_PERIOD,
  LEAVE_ENTITLEMENT_LIST,
  MONTHLY_LEAVE_CREDIT,
} from "@twm/shared";
import { getStore } from "../store/index.js";
import { effectiveAllotment, summarizeBalances } from "./leaveService.js";

// The month (YYYY-MM) `date` falls in, on the local (IST) clock.
export function creditPeriod(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(period) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function zeroes() {
  return Object.fromEntries(LEAVE_ENTITLEMENT_LIST.map((t) => [t, 0]));
}

// What someone's allotment for `year` effectively is before this month's
// credit is added, for when they have no saved row for that year yet. That
// only happens on the first credit of a new year — unused leave carries
// forward, so it starts from what was left last year — or, in the year the
// monthly credit started, for people whose allotment was never saved (they
// see the company default, and keep it).
async function baseAllotment(store, employeeId, year, rows) {
  if (rows.length > 0) return effectiveAllotment(rows);
  if (year <= Number(LEAVE_CREDIT_START_PERIOD.slice(0, 4))) return effectiveAllotment([]);
  const lastYear = year - 1;
  const leave = (await store.listLeave()).filter((row) => row.employeeId === employeeId);
  const items = summarizeBalances(leave, lastYear, await store.getEntitlements(employeeId, lastYear));
  return Object.fromEntries(items.map((item) => [item.leaveType, item.remaining ?? 0]));
}

// Credits this month's leave to everyone active: Full time gets 1 casual +
// 0.5 sick, Intern/Probation 1 casual. Safe to run as often as you like —
// store.creditMonthlyLeave records each person-month once, so later runs in
// the same month are no-ops. Only the current month is ever credited; a
// missed month isn't backfilled, which would otherwise credit new joiners for
// months before they joined.
export async function runMonthlyLeaveCredit({ now = new Date() } = {}) {
  const period = creditPeriod(now);
  if (period < LEAVE_CREDIT_START_PERIOD) return [];
  const year = now.getFullYear();
  const store = getStore();
  const employees = (await store.listEmployees()).filter((e) => e.employmentStatus !== "inactive");
  const credited = [];
  for (const employee of employees) {
    try {
      const employmentType = employee.employmentType || EMPLOYMENT_TYPES.FULL_TIME;
      const credit = MONTHLY_LEAVE_CREDIT[employmentType] || MONTHLY_LEAVE_CREDIT[EMPLOYMENT_TYPES.FULL_TIME];
      const rows = await store.getEntitlements(employee.id, year);
      const base = await baseAllotment(store, employee.id, year, rows);
      const baseIfMissing = Object.fromEntries(LEAVE_ENTITLEMENT_LIST.map((t) => [t, base[t] ?? 0]));
      const added = await store.creditMonthlyLeave({
        employeeId: employee.id,
        period,
        year,
        employmentType,
        credit,
        baseIfMissing,
      });
      if (!added) continue;
      await store.writeAudit({
        actorUserId: null,
        action: "leave.monthly_credit",
        entity: "leave_entitlements",
        entityId: employee.id,
        targetEmployeeId: employee.id,
        targetName: employee.legalName,
        summary: `Monthly leave credit for ${periodLabel(period)}: +${credit.casual} casual${credit.sick ? `, +${credit.sick} sick` : ""} (${EMPLOYMENT_TYPE_LABELS[employmentType]})`,
        beforeJson: rows.length > 0 ? effectiveAllotment(rows) : null,
        afterJson: { period, year, employmentType, ...credit },
      });
      credited.push({ employeeId: employee.id, period, ...credit });
    } catch (err) {
      console.error(`Monthly leave credit failed for employee ${employee.id}:`, err);
    }
  }
  return credited;
}

// A new joiner starts from zero and gets their first credit on the next 1st:
// save an explicit zero allotment for this year (instead of the company
// default they'd otherwise see) and mark the month they join as done.
export async function startLeaveCreditForNewJoiner({ employee, now = new Date() }) {
  await getStore().creditMonthlyLeave({
    employeeId: employee.id,
    period: creditPeriod(now),
    year: now.getFullYear(),
    employmentType: employee.employmentType || EMPLOYMENT_TYPES.FULL_TIME,
    credit: zeroes(),
    baseIfMissing: zeroes(),
  });
}
