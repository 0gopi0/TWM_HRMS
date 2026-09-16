import { labelForRole } from "@twm/shared";
import { getStore } from "../store/index.js";
import { asYmd } from "./leaveService.js";

export function buildOrgForest(employees, usersById, statusById = new Map()) {
  const nodes = employees.map((e) => ({
    id: e.id,
    name: e.legalName,
    employeeNumber: e.employeeNumber,
    role: usersById.get(e.userId)?.role || "",
    roleLabel: e.jobTitle || labelForRole(usersById.get(e.userId)?.role),
    managerId: e.managerId,
    status: statusById.get(e.id) || "inactive",
    reports: [],
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roots = [];
  for (const node of nodes) {
    const parent = node.managerId ? byId.get(node.managerId) : null;
    if (parent) parent.reports.push(node);
    else roots.push(node);
  }
  return roots;
}

// Derive a live status for each employee:
//   on_leave  -> has an approved leave that covers today
//   active    -> currently clocked in (open attendance entry)
//   inactive  -> not clocked in
// On leave takes precedence over clock-in status.
export async function computeStatusById(store, employees) {
  const [leaveRows, attendanceRows] = await Promise.all([
    store.listLeave(),
    store.listAllAttendance(),
  ]);
  const today = new Date().toLocaleDateString("en-CA");
  // MySQL hands back DATE columns as Date objects, so normalize to YYYY-MM-DD
  // strings before comparing with `today` — same as the calendar and the
  // clock-in guard do.
  const onLeave = new Set(
    leaveRows
      .filter(
        (r) => r.status === "approved" && asYmd(r.startDate) <= today && asYmd(r.endDate) >= today,
      )
      .map((r) => r.employeeId),
  );
  const clockedIn = new Set(attendanceRows.filter((a) => !a.clockOutAt).map((a) => a.employeeId));
  const map = new Map();
  for (const e of employees) {
    if (onLeave.has(e.id)) map.set(e.id, "on_leave");
    else if (clockedIn.has(e.id)) map.set(e.id, "active");
    else map.set(e.id, "inactive");
  }
  return map;
}

export async function getOrgChart() {
  const store = getStore();
  const employees = await store.listEmployees();
  const usersById = new Map();
  await Promise.all(
    employees.map(async (e) => {
      const user = await store.findUserById(e.userId);
      if (user) usersById.set(e.userId, user);
    }),
  );
  const statusById = await computeStatusById(store, employees);
  return { tree: buildOrgForest(employees, usersById, statusById) };
}
