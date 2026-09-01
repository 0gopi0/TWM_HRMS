import { randomUUID } from "node:crypto";
import { HOLIDAY_KINDS } from "@twm/shared";
import { getStore } from "../store/index.js";
import { HttpError } from "../utils/httpError.js";

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

function pad(n) {
  return String(n).padStart(2, "0");
}

export function monthBounds(year, month) {
  const last = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(last)}`,
  };
}

export async function getCalendarMonth(year, month) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new HttpError(422, "Invalid year");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new HttpError(422, "Invalid month");
  }
  const { from, to } = monthBounds(year, month);
  const store = getStore();
  const employees = await store.listEmployees();
  const byId = new Map(employees.map((e) => [e.id, e]));
  const holidays = (await store.listHolidays())
    .map((h) => ({
      id: h.id,
      name: h.name,
      date: asYmd(h.date),
      kind: h.kind,
    }))
    .filter((h) => h.date >= from && h.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date));
  const leaves = (await store.listLeave())
    .filter((row) => row.status === "approved")
    .map((row) => ({
      id: row.id,
      employeeId: row.employeeId,
      name: byId.get(row.employeeId)?.legalName || "Employee",
      leaveType: row.leaveType,
      startDate: asYmd(row.startDate),
      endDate: asYmd(row.endDate),
    }))
    .filter((row) => row.startDate <= to && row.endDate >= from);
  return { year, month, from, to, holidays, leaves };
}

export async function createHoliday({ name, date, kind }) {
  if (!Object.values(HOLIDAY_KINDS).includes(kind)) {
    throw new HttpError(422, "Kind must be festival or optional");
  }
  const row = {
    id: randomUUID(),
    name: name.trim(),
    date,
    kind,
  };
  if (!row.name) throw new HttpError(422, "Name is required");
  return getStore().createHoliday(row);
}
