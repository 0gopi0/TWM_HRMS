import { randomUUID } from "node:crypto";
import { AUTO_CLOCKOUT_HOUR, HOLIDAY_KINDS } from "@twm/shared";
import { getStore } from "../store/index.js";
import { HttpError } from "../utils/httpError.js";
import { asYmd, isOnFullDayLeave } from "./leaveService.js";

function mapEntry(row) {
  if (!row) return null;
  return {
    id: row.id,
    employeeId: row.employeeId,
    clockInAt: row.clockInAt,
    clockOutAt: row.clockOutAt,
  };
}

// Saturdays, Sundays, and festival holidays are company-wide days off, so
// clock in/out is disabled on them. Optional holidays are not enforced —
// employees choose whether to take those.
export async function getDayOff(ymd) {
  const weekday = new Date(`${ymd}T00:00:00`).getDay();
  if (weekday === 0 || weekday === 6) {
    return { type: "weekend", label: weekday === 0 ? "Sunday" : "Saturday" };
  }
  const holiday = (await getStore().listHolidays()).find(
    (h) => h.kind === HOLIDAY_KINDS.FESTIVAL && asYmd(h.date) === ymd,
  );
  return holiday ? { type: "holiday", label: holiday.name } : null;
}

function dayOffMessage(dayOff, action) {
  return dayOff.type === "holiday"
    ? `${dayOff.label} is a festival holiday — ${action} is disabled`
    : `It's ${dayOff.label} — ${action} is disabled`;
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
    dayOff: await getDayOff(today),
  };
}

export async function clockIn(employee) {
  if (!employee) throw new HttpError(409, "No employee profile");
  const store = getStore();
  const open = await store.getOpenAttendance(employee.id);
  if (open) throw new HttpError(409, "Already clocked in");
  const status = await getAttendanceStatus(employee);
  if (status.dayOff) throw new HttpError(409, dayOffMessage(status.dayOff, "clock in"));
  if (status.completeForToday || status.today.length > 0) {
    throw new HttpError(409, "Already clocked for today");
  }
  const today = new Date().toLocaleDateString("en-CA");
  if (await isOnFullDayLeave(employee.id, today)) {
    throw new HttpError(409, "You're on approved leave today — clock in is disabled");
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
  const dayOff = await getDayOff(new Date().toLocaleDateString("en-CA"));
  if (dayOff) throw new HttpError(409, dayOffMessage(dayOff, "clock out"));
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

// The instant an entry is auto-closed at: AUTO_CLOCKOUT_HOUR on the local day it
// was opened. Someone who clocked in after that hour is closed out at their own
// clock-in time instead, so the entry never runs backwards.
function autoClockOutAt(clockInAt) {
  const hour = String(AUTO_CLOCKOUT_HOUR).padStart(2, "0");
  const cutoff = new Date(`${dayKey(clockInAt)}T${hour}:00:00`);
  const clockedIn = new Date(clockInAt);
  return cutoff < clockedIn ? clockedIn : cutoff;
}

// Closes out anyone still clocked in whose cutoff has passed — a forgotten
// clock-out would otherwise leave them "Clocked in" for good on the dashboard,
// the directory, and the org chart. Runs at AUTO_CLOCKOUT_HOUR and once at boot
// (see index.js); the boot pass catches a restart that skipped the evening run.
// Returns the entries it closed, so the caller can report them.
export async function autoClockOutOpenEntries({ now = new Date() } = {}) {
  const store = getStore();
  const open = (await store.listAllAttendance()).filter((row) => !row.clockOutAt);
  const closed = [];
  for (const entry of open) {
    try {
      const clockOutAt = autoClockOutAt(entry.clockInAt);
      // Today's cutoff hasn't arrived yet — they may still be working.
      if (clockOutAt > now) continue;
      const iso = clockOutAt.toISOString();
      await store.closeAttendance(entry.id, iso);
      await store.writeAudit({
        actorUserId: null,
        action: "attendance.auto_clock_out",
        entity: "attendance_entry",
        entityId: entry.id,
        targetEmployeeId: entry.employeeId,
        beforeJson: { clockInAt: entry.clockInAt },
        afterJson: { clockOutAt: iso },
      });
      closed.push({ id: entry.id, employeeId: entry.employeeId, clockInAt: entry.clockInAt, clockOutAt: iso });
    } catch (err) {
      console.error(`Auto clock-out failed for attendance entry ${entry.id}:`, err);
    }
  }
  return closed;
}
