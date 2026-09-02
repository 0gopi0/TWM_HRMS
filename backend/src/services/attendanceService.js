import { randomUUID } from "node:crypto";
import { getStore } from "../store/index.js";
import { HttpError } from "../utils/httpError.js";

function mapEntry(row) {
  if (!row) return null;
  return {
    id: row.id,
    employeeId: row.employeeId,
    clockInAt: row.clockInAt,
    clockOutAt: row.clockOutAt,
  };
}

function dayKey(iso) {
  return new Date(iso).toLocaleDateString("en-CA");
}

export async function getAttendanceStatus(employee) {
  if (!employee) throw new HttpError(409, "No employee profile");
  const entries = await getStore().listAttendance(employee.id);
  const today = new Date().toLocaleDateString("en-CA");
  const todayEntries = entries.filter((e) => dayKey(e.clockInAt) === today).map(mapEntry);
  const open = entries.find((e) => !e.clockOutAt) || null;
  const lastToday = todayEntries[todayEntries.length - 1] || null;
  const completeForToday = Boolean(lastToday?.clockOutAt);
  return {
    clockedIn: Boolean(open),
    completeForToday,
    clockInAt: open?.clockInAt || lastToday?.clockInAt || null,
    clockOutAt: open ? null : lastToday?.clockOutAt || null,
    today: todayEntries,
  };
}

export async function clockIn(employee) {
  if (!employee) throw new HttpError(409, "No employee profile");
  const store = getStore();
  const open = await store.getOpenAttendance(employee.id);
  if (open) throw new HttpError(409, "Already clocked in");
  const status = await getAttendanceStatus(employee);
  if (status.completeForToday || status.today.length > 0) {
    throw new HttpError(409, "Already clocked for today");
  }
  const row = {
    id: randomUUID(),
    employeeId: employee.id,
    clockInAt: new Date().toISOString(),
    clockOutAt: null,
  };
  await store.createAttendance(row);
  await store.writeAudit({
    actorUserId: employee.userId,
    action: "attendance.clock_in",
    entity: "attendance_entry",
    entityId: row.id,
    afterJson: { clockInAt: row.clockInAt },
  });
  return getAttendanceStatus(employee);
}

// All attendance entries for people management (HR / admin / owner only).
export async function listAllAttendance() {
  const rows = await getStore().listAllAttendance();
  return rows.map(mapEntry);
}

export async function clockOut(employee) {
  if (!employee) throw new HttpError(409, "No employee profile");
  const store = getStore();
  const open = await store.getOpenAttendance(employee.id);
  if (!open) throw new HttpError(409, "Not clocked in");
  const clockOutAt = new Date().toISOString();
  await store.closeAttendance(open.id, clockOutAt);
  await store.writeAudit({
    actorUserId: employee.userId,
    action: "attendance.clock_out",
    entity: "attendance_entry",
    entityId: open.id,
    beforeJson: { clockInAt: open.clockInAt },
    afterJson: { clockOutAt },
  });
  return getAttendanceStatus(employee);
}
