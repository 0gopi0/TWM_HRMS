import { useEffect, useMemo, useState } from "react";
import { ASSIGNABLE_ROLES, PERMISSIONS, ROLES, ROLE_LABELS } from "@twm/shared";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useToast } from "../toast.jsx";

function fmtTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(11, 16);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dayKey(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString("en-CA");
}

function currentMonthKey() {
  return new Date().toLocaleDateString("en-CA").slice(0, 7);
}

function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString([], { month: "long", year: "numeric" });
}

function fmtDay(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}

// Minutes worked on an entry; null while a shift is still open.
function entryMinutes(entry) {
  if (!entry?.clockOutAt) return null;
  return Math.max(0, Math.round((new Date(entry.clockOutAt) - new Date(entry.clockInAt)) / 60000));
}

function fmtHours(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Days an (approved, unpaid) leave row overlaps the current calendar month —
// same "full days, or 0.5 for a half-day single-day leave" rule the backend
// uses for leave balances, just bounded to this month instead of the year.
function lopDaysThisMonth(row) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const start = new Date(`${row.startDate}T00:00:00`);
  const end = new Date(`${row.endDate}T00:00:00`);
  const s = start < monthStart ? monthStart : start;
  const e = end > monthEnd ? monthEnd : end;
  if (e < s) return 0;
  if (row.halfDay) return 0.5;
  return Math.round((e - s) / 86400000) + 1;
}

function emptyLopForm() {
  const today = new Date().toLocaleDateString("en-CA");
  return { startDate: today, endDate: today, halfDay: false, reason: "" };
}

function emptyForm() {
  return {
    legalName: "",
    employeeNumber: "",
    email: "",
    password: "",
    jobTitle: "",
    role: "team_member",
    departmentId: "",
    reportsTo: "",
    leaveApproverId: "",
  };
}

// Sentinel for "reports straight to the top of the org chart, no team yet" —
// used when a department doesn't have a team leader to join (e.g. the
// department's first hire, or a new team leader themselves).
const REPORTS_TO_TOP = "__top__";

export function EmployeesPage() {
  const { can } = useAuth();
  const { notify } = useToast();
  const canManage = can(PERMISSIONS.EMPLOYEE_WRITE_COMPANY);
  const [rows, setRows] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [notice, setNotice] = useState("");
  const [removingId, setRemovingId] = useState("");
  const [restoringId, setRestoringId] = useState("");
  // Removed people are deactivated rather than erased when they still have
  // records, so they're out of the directory until this is switched on.
  const [showFormer, setShowFormer] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [leaveRows, setLeaveRows] = useState([]);
  const [lopFor, setLopFor] = useState(null);
  const [lopForm, setLopForm] = useState(emptyLopForm);
  const [lopSaving, setLopSaving] = useState(false);
  const [lopError, setLopError] = useState("");
  const [editingLopId, setEditingLopId] = useState(null);
  const [removingLopId, setRemovingLopId] = useState(null);
  // Person whose attendance detail tab is open (null = the directory tab).
  const [attendanceFor, setAttendanceFor] = useState(null);
  const [attMonth, setAttMonth] = useState(currentMonthKey);

  async function load({ includeInactive = showFormer } = {}) {
    const people = `/api/v1/employees?pageSize=100${includeInactive ? "&includeInactive=1" : ""}`;
    const jobs = [api(people), api("/api/v1/attendance/all")];
    if (canManage) {
      jobs.push(
        api("/api/v1/employees/departments"),
        api("/api/v1/employees/teams"),
        api("/api/v1/leave?pageSize=500"),
      );
    }
    const [emps, att, depts, tms, leave] = await Promise.all(jobs);
    setRows(emps.data);
    setAttendance(att.data || []);
    setTotal(emps.meta?.total ?? emps.data.length);
    if (depts) setDepartments(depts.data || []);
    if (tms) setTeams(tms.data || []);
    if (leave) setLeaveRows(leave.data || []);
  }

  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byId = Object.fromEntries(rows.map((e) => [e.id, e]));
  const attendancePerson = attendanceFor ? byId[attendanceFor] : null;

  // One person's clock in/out for the selected month, newest day first.
  // Clock in is limited to one entry per day, so each row is a day.
  const attendanceDetail = useMemo(() => {
    if (!attendanceFor) return null;
    const entries = attendance
      .filter((a) => a.employeeId === attendanceFor && dayKey(a.clockInAt).slice(0, 7) === attMonth)
      .sort((a, b) => (a.clockInAt < b.clockInAt ? 1 : -1));
    return {
      entries,
      totalMinutes: entries.reduce((sum, a) => sum + (entryMinutes(a) ?? 0), 0),
      openCount: entries.filter((a) => !a.clockOutAt).length,
    };
  }, [attendance, attendanceFor, attMonth]);

  function openAttendance(emp) {
    setAttendanceFor(emp.id);
    setAttMonth(currentMonthKey());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // The one person with no manager is the top of the org chart (Manoj).
  const orgTop = useMemo(() => rows.find((e) => !e.managerId), [rows]);

  const teamsInDepartment = useMemo(
    () => teams.filter((t) => t.departmentId === form.departmentId),
    [teams, form.departmentId],
  );

  // "Reports to" collapses team + manager into one choice. Two kinds of person
  // qualify: whoever leads a team in this department (the seeded org has team
  // leads whose role is HR or Admin, not "Team leader"), and anyone carrying
  // the Team leader role here — a department can have more than one lead, and
  // only one of them owns the team row. Picking someone who does lead a team
  // also joins that team, so the two can't disagree.
  const reportsToOptions = useMemo(() => {
    const candidates = new Set(teamsInDepartment.map((t) => t.leaderEmployeeId).filter(Boolean));
    for (const p of rows) {
      if (p.departmentId === form.departmentId && p.role === ROLES.TEAM_LEADER) candidates.add(p.id);
    }
    const leaders = rows
      .filter((p) => candidates.has(p.id) && p.id !== editingId)
      .map((p) => {
        const team = teamsInDepartment.find((t) => t.leaderEmployeeId === p.id);
        return { value: p.id, label: team ? `${p.legalName} — ${team.name}` : p.legalName };
      });
    if (orgTop && orgTop.id !== editingId) {
      leaders.push({ value: REPORTS_TO_TOP, label: `${orgTop.legalName} (top of the org, no team)` });
    }
    return leaders;
  }, [rows, teamsInDepartment, form.departmentId, orgTop, editingId]);

  // Leave approver must be a team lead or above — a team member can't approve leave.
  const approverOptions = useMemo(
    () => rows.filter((p) => p.role && p.role !== ROLES.TEAM_MEMBER && p.id !== editingId),
    [rows, editingId],
  );

  // LOP (loss of pay) this month, per employee — approved unpaid leave,
  // whether it came from the employee applying or an admin logging it here.
  const lopByEmployee = useMemo(() => {
    const map = new Map();
    for (const row of leaveRows) {
      if (row.leaveType !== "unpaid" || row.status !== "approved") continue;
      const days = lopDaysThisMonth(row);
      if (days > 0) map.set(row.employeeId, (map.get(row.employeeId) || 0) + days);
    }
    return map;
  }, [leaveRows]);

  // All LOP entries logged for one employee, newest first — shown in the
  // modal below the form so HR can edit or remove any of them.
  const lopListFor = useMemo(() => {
    const map = new Map();
    for (const row of leaveRows) {
      if (!row.isLop) continue;
      const list = map.get(row.employeeId) || [];
      list.push(row);
      map.set(row.employeeId, list);
    }
    for (const list of map.values()) list.sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    return map;
  }, [leaveRows]);

  function openLopModal(emp) {
    setLopFor(emp.id);
    setLopForm(emptyLopForm());
    setEditingLopId(null);
    setLopError("");
  }

  function closeLopModal() {
    setLopFor(null);
    setEditingLopId(null);
    setLopError("");
  }

  function startEditLop(row) {
    setEditingLopId(row.id);
    setLopForm({
      startDate: row.startDate,
      endDate: row.endDate,
      halfDay: Boolean(row.halfDay),
      reason: row.reason || "",
    });
    setLopError("");
  }

  function cancelEditLop() {
    setEditingLopId(null);
    setLopForm(emptyLopForm());
    setLopError("");
  }

  async function submitLop(e) {
    e.preventDefault();
    setLopError("");
    if (lopForm.endDate < lopForm.startDate) {
      setLopError("End date must be on or after start date.");
      return;
    }
    setLopSaving(true);
    try {
      const body = {
        leaveType: "unpaid",
        startDate: lopForm.startDate,
        endDate: lopForm.endDate,
        halfDay: lopForm.startDate === lopForm.endDate ? lopForm.halfDay : false,
        reason: lopForm.reason.trim() || undefined,
        status: "approved",
      };
      if (editingLopId) {
        await api(`/api/v1/leave/${editingLopId}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await api("/api/v1/leave/managed", {
          method: "POST",
          body: JSON.stringify({ ...body, employeeId: lopFor }),
        });
      }
      setEditingLopId(null);
      setLopForm(emptyLopForm());
      await load();
    } catch (err) {
      setLopError(err.message);
    } finally {
      setLopSaving(false);
    }
  }

  async function removeLop(row) {
    if (!window.confirm(`Remove this LOP entry (${row.startDate} → ${row.endDate})? This can't be undone.`)) return;
    setLopError("");
    setRemovingLopId(row.id);
    try {
      await api(`/api/v1/leave/${row.id}`, { method: "DELETE" });
      if (editingLopId === row.id) cancelEditLop();
      await load();
    } catch (err) {
      setLopError(err.message);
    } finally {
      setRemovingLopId(null);
    }
  }

  const editingEmployee = editingId ? byId[editingId] : null;
  // Owner/Admin/Manager aren't hand-out-able from this form (same rule the
  // backend enforces) — if that's already their role, leave it untouched
  // rather than offering a picker that can't represent their real role.
  const roleEditable = !editingId || ASSIGNABLE_ROLES.includes(editingEmployee?.role);
  // The org top has no manager by definition — there's no valid "reports
  // to" choice for them, so the field is informational only when editing them.
  const isOrgTop = editingId != null && editingId === orgTop?.id;

  function startEdit(emp) {
    // "Reports to" is keyed by manager id, not team id — someone who leads
    // their own team still reports to whoever THEY report to, not to
    // themselves. (teamId always matches managerId's team once saved, so
    // deriving from managerId alone is enough.)
    const reportsTo = !emp.managerId ? "" : emp.managerId === orgTop?.id ? REPORTS_TO_TOP : emp.managerId;
    setEditingId(emp.id);
    setForm({
      ...emptyForm(),
      legalName: emp.legalName || "",
      employeeNumber: emp.employeeNumber || "",
      email: emp.email || "",
      jobTitle: emp.jobTitle || "",
      role: emp.role || "team_member",
      departmentId: emp.departmentId || "",
      reportsTo,
      leaveApproverId: emp.leaveApproverId || "",
    });
    setCreateError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setCreateError("");
  }

  async function submitForm(e) {
    e.preventDefault();
    setCreateError("");
    setNotice("");
    // A <select> whose bound value isn't among its rendered options (e.g. an
    // option that got filtered out after the form loaded) silently displays
    // a different option while React's state keeps the stale value — guard
    // against ever submitting that mismatch instead of trusting the picker.
    if (
      !isOrgTop &&
      form.reportsTo !== REPORTS_TO_TOP &&
      !reportsToOptions.some((o) => o.value === form.reportsTo)
    ) {
      setCreateError("Reports to selection is out of date — please re-pick it.");
      return;
    }
    setCreating(true);
    try {
      const reportsToTop = form.reportsTo === REPORTS_TO_TOP;
      const team = reportsToTop
        ? null
        : teamsInDepartment.find((t) => t.leaderEmployeeId === form.reportsTo);
      const payload = {
        legalName: form.legalName.trim(),
        jobTitle: form.jobTitle.trim() || undefined,
        departmentId: form.departmentId,
        // The org top keeps no team/manager, regardless of what the
        // (disabled, informational-only) Reports to field shows for them.
        teamId: isOrgTop ? undefined : team?.id || undefined,
        managerId: isOrgTop ? undefined : reportsToTop ? orgTop?.id : form.reportsTo || undefined,
        leaveApproverId: form.leaveApproverId || undefined,
      };
      if (roleEditable) payload.role = form.role;

      if (editingId) {
        await api(`/api/v1/employees/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({ ...payload, employeeNumber: form.employeeNumber.trim(), email: form.email.trim() }),
        });
        setNotice("Employee updated.");
      } else {
        await api("/api/v1/employees", {
          method: "POST",
          body: JSON.stringify({ ...payload, email: form.email.trim(), password: form.password }),
        });
        setNotice("Employee created.");
      }
      setEditingId(null);
      setForm(emptyForm());
      await load();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function removeEmployee(emp) {
    const ok = window.confirm(
      `Remove ${emp.legalName} (${emp.employeeNumber})? This deletes their leave requests and balance, attendance, salary and payslip history for good, and clears them as anyone's manager, team lead or leave approver. If they approved someone else's leave or processed payroll, that audit trail is kept and they're deactivated instead of erased.`,
    );
    if (!ok) return;
    setError("");
    setRemovingId(emp.id);
    try {
      const res = await api(`/api/v1/employees/${emp.id}`, { method: "DELETE" });
      notify(
        res?.data?.outcome === "deactivated"
          ? `${emp.legalName} deactivated — login off, their leave/attendance/pay records erased`
          : `${emp.legalName} removed`,
        "success",
      );
      await load();
    } catch (err) {
      notify(`Couldn't remove ${emp.legalName}: ${err.message}`, "error");
    } finally {
      setRemovingId("");
    }
  }

  async function restoreEmployee(emp) {
    setRestoringId(emp.id);
    try {
      await api(`/api/v1/employees/${emp.id}/restore`, { method: "POST" });
      notify(`${emp.legalName} restored to the directory`, "success");
      await load();
    } catch (err) {
      notify(`Couldn't restore ${emp.legalName}: ${err.message}`, "error");
    } finally {
      setRestoringId("");
    }
  }

  // Today's clock-in/clock-out per employee; if none today, the latest entry.
  const today = new Date().toLocaleDateString("en-CA");
  const attByEmp = new Map();
  for (const a of attendance) {
    const day = dayKey(a.clockInAt);
    const prev = attByEmp.get(a.employeeId);
    // prefer today's entries, then the most recent entry overall
    if (!prev) attByEmp.set(a.employeeId, { ...a, day });
    else if (day === today && prev.day !== today) attByEmp.set(a.employeeId, { ...a, day });
    else if (day === today && prev.day === today && a.clockInAt >= prev.clockInAt) {
      attByEmp.set(a.employeeId, { ...a, day });
    } else if (day !== today && prev.day !== today && a.clockInAt >= prev.clockInAt) {
      attByEmp.set(a.employeeId, { ...a, day });
    }
  }

  return (
    <div className="section-stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">People</h1>
          <p className="page-sub">
            {loading
              ? "Loading…"
              : `${total ?? rows.length} ${showFormer ? "in the directory" : "on the team"} · today's clock in/out`}
          </p>
        </div>
      </div>
      <div className="page-tabs" role="tablist" aria-label="People sections">
        <button
          type="button"
          role="tab"
          aria-selected={!attendanceFor}
          className={`page-tab${attendanceFor ? "" : " on"}`}
          onClick={() => setAttendanceFor(null)}
        >
          Directory
        </button>
        {attendancePerson ? (
          <button
            type="button"
            role="tab"
            aria-selected
            className="page-tab on"
            title="Back to the directory"
            onClick={() => setAttendanceFor(null)}
          >
            Attendance — {attendancePerson.legalName}
          </button>
        ) : null}
      </div>
      {error ? <p className="error">{error}</p> : null}

      {canManage ? (
        <form className="card form form-wide" onSubmit={submitForm}>
          <h2>{editingId ? `Edit ${editingEmployee?.legalName || "employee"}` : "Add employee"}</h2>
          {createError ? <p className="error">{createError}</p> : null}
          {notice ? <p className="success">{notice}</p> : null}
          <div className="payroll-grid">
            <label>
              Full name
              <input
                value={form.legalName}
                onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                required
              />
            </label>
            {editingId ? (
              <label>
                Employee ID
                <input
                  value={form.employeeNumber}
                  onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })}
                  required
                />
              </label>
            ) : null}
            <label>
              Job title
              <input
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                placeholder="Optional"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@twm.local"
                required
              />
            </label>
            {editingId ? null : (
              <label>
                Password
                <input
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 8 characters"
                  required
                />
              </label>
            )}
            <label>
              Role
              {roleEditable ? (
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r] || r}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={ROLE_LABELS[editingEmployee?.role] || editingEmployee?.role || ""} disabled />
              )}
            </label>
            <label>
              Department
              <select
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value, reportsTo: "" })}
                required
              >
                <option value="" disabled>
                  Choose
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Reports to
              {isOrgTop ? (
                <input value="Top of the org — no manager" disabled />
              ) : (
                <select
                  value={form.reportsTo}
                  onChange={(e) => setForm({ ...form, reportsTo: e.target.value })}
                  required
                  disabled={!form.departmentId}
                >
                  <option value="" disabled>
                    {form.departmentId ? "Choose" : "Pick a department first"}
                  </option>
                  {reportsToOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label>
              Leave approver
              <select
                value={form.leaveApproverId}
                onChange={(e) => setForm({ ...form, leaveApproverId: e.target.value })}
              >
                <option value="">Same as manager</option>
                {approverOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.legalName}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" type="submit" disabled={creating} style={{ width: "fit-content" }}>
              {creating ? "Saving…" : editingId ? "Save changes" : "Create employee"}
            </button>
            {editingId ? (
              <button className="btn btn-ghost" type="button" onClick={cancelEdit} disabled={creating}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {attendanceFor ? (
        <div className="card table-card">
          <div className="table-head">
            <h2>{attendancePerson?.legalName || "Employee"} — attendance</h2>
            <span className="muted" style={{ fontSize: 12 }}>
              {attendancePerson?.employeeNumber || ""}
              {attendancePerson?.jobTitle ? ` · ${attendancePerson.jobTitle}` : ""}
            </span>
            <span className="spacer" />
            <label className="muted" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
              Month
              <input
                type="month"
                value={attMonth}
                max={currentMonthKey()}
                onChange={(e) => setAttMonth(e.target.value)}
              />
            </label>
          </div>
          {attendanceDetail.entries.length ? (
            <p className="muted" style={{ padding: "0 22px 12px", margin: 0, fontSize: 12 }}>
              {monthLabel(attMonth)} · {attendanceDetail.entries.length}{" "}
              {attendanceDetail.entries.length === 1 ? "day" : "days"} recorded ·{" "}
              {fmtHours(attendanceDetail.totalMinutes)} clocked
              {attendanceDetail.openCount
                ? ` · ${attendanceDetail.openCount} not clocked out`
                : ""}
            </p>
          ) : null}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Clock in</th>
                  <th>Clock out</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {attendanceDetail.entries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted" style={{ padding: "20px 22px" }}>
                      No clock in/out recorded in {monthLabel(attMonth)}.
                    </td>
                  </tr>
                ) : (
                  attendanceDetail.entries.map((a) => {
                    const mins = entryMinutes(a);
                    return (
                      <tr key={a.id}>
                        <td>
                          <strong>{fmtDay(a.clockInAt)}</strong>
                        </td>
                        <td>{fmtTime(a.clockInAt)}</td>
                        <td>
                          {a.clockOutAt ? (
                            fmtTime(a.clockOutAt)
                          ) : (
                            <span className="employment-pill active">In progress</span>
                          )}
                        </td>
                        <td>{mins == null ? "—" : fmtHours(mins)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      <div className="card table-card">
        <div className="table-head">
          <h2>Directory &amp; attendance</h2>
          <span className="spacer" />
          {canManage ? (
            <label className="muted" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={showFormer}
                onChange={(e) => {
                  const next = e.target.checked;
                  setShowFormer(next);
                  setError("");
                  load({ includeInactive: next }).catch((err) => setError(err.message));
                }}
              />
              Show former employees
            </label>
          ) : null}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th>Name</th>
                <th>Title</th>
                <th>Reports to</th>
                <th>Clock in</th>
                <th>Clock out</th>
                <th>{canManage ? "LOP" : "Status"}</th>
                <th>Attendance</th>
                {canManage ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canManage ? 9 : 8} className="muted" style={{ padding: "20px 22px" }}>
                    Loading directory…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 9 : 8} className="muted" style={{ padding: "20px 22px" }}>
                    No one to show yet.
                  </td>
                </tr>
              ) : (
                rows.map((e) => {
                  const a = attByEmp.get(e.id);
                  const isToday = a?.day === today;
                  const former = e.employmentStatus === "inactive";
                  const opened = a?.clockInAt != null && !a.clockOutAt;
                  const closedToday = a?.clockOutAt != null && isToday;
                  // Status reflects today: only actual open/closes today matter.
                  let status = null;
                  let cls = "";
                  if (opened) {
                    status = "Clocked in";
                    cls = "active";
                  } else if (closedToday) {
                    status = "Clocked out";
                    cls = "closed";
                  } else {
                    status = "Not clocked in";
                    cls = "absent";
                  }
                  return (
                    <tr key={e.id}>
                      <td><code style={{ fontSize: 12, color: "var(--text-muted)" }}>{e.employeeNumber}</code></td>
                      <td><strong>{e.legalName}</strong></td>
                      <td>{e.jobTitle || "—"}</td>
                      <td>{e.managerId ? byId[e.managerId]?.legalName || "—" : "—"}</td>
                      <td>
                        {isToday && a?.clockInAt ? (
                          <>🕐 {fmtTime(a.clockInAt)}</>
                        ) : a?.clockInAt ? (
                          <span className="muted">{a.day} · {fmtTime(a.clockInAt)}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {isToday && a?.clockOutAt
                          ? <>🕐 {fmtTime(a.clockOutAt)}</>
                          : a?.day === today ? "Still in" : a?.clockOutAt ? (
                            <span className="muted">{a.day} · {fmtTime(a.clockOutAt)}</span>
                          ) : "—"}
                      </td>
                      <td>
                        {former ? (
                          <span className="employment-pill terminated">Former</span>
                        ) : canManage ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className={lopByEmployee.get(e.id) ? "employment-pill absent" : "muted"}>
                              {lopByEmployee.get(e.id) ? `${lopByEmployee.get(e.id)} day${lopByEmployee.get(e.id) === 1 ? "" : "s"}` : "—"}
                            </span>
                            <button
                              className="icon-btn lop-add-btn"
                              type="button"
                              title={`Log LOP for ${e.legalName}`}
                              onClick={() => openLopModal(e)}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className={`employment-pill ${cls}`}>{status}</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost"
                          type="button"
                          onClick={() => openAttendance(e)}
                        >
                          View more
                        </button>
                      </td>
                      {canManage ? (
                        <td>
                          {former ? (
                            <button
                              className="btn btn-ghost"
                              type="button"
                              disabled={restoringId === e.id}
                              onClick={() => restoreEmployee(e)}
                            >
                              {restoringId === e.id ? "…" : "Restore"}
                            </button>
                          ) : (
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                className="btn btn-ghost"
                                type="button"
                                onClick={() => startEdit(e)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-ghost"
                                type="button"
                                disabled={removingId === e.id}
                                onClick={() => removeEmployee(e)}
                              >
                                {removingId === e.id ? "…" : "Remove"}
                              </button>
                            </div>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {lopFor ? (
        <div className="modal-scrim" onClick={closeLopModal}>
          <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>
              {editingLopId ? "Edit LOP" : "Log LOP"} — {byId[lopFor]?.legalName}
            </h2>
            <p className="muted" style={{ marginTop: -8 }}>
              Recorded as an approved LOP (loss of pay) day, and deducted from this employee's next payslip for
              the period it falls in.
            </p>
            {lopError ? <p className="error">{lopError}</p> : null}
            <form onSubmit={submitLop}>
              <div className="date-row">
                <label>
                  Start
                  <input
                    type="date"
                    value={lopForm.startDate}
                    onChange={(e) =>
                      setLopForm((f) => ({
                        ...f,
                        startDate: e.target.value,
                        endDate: f.endDate < e.target.value ? e.target.value : f.endDate,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  End
                  <input
                    type="date"
                    min={lopForm.startDate}
                    value={lopForm.endDate}
                    onChange={(e) => setLopForm((f) => ({ ...f, endDate: e.target.value }))}
                    required
                  />
                </label>
              </div>
              {lopForm.startDate === lopForm.endDate ? (
                <label className="half-day">
                  <input
                    type="checkbox"
                    checked={lopForm.halfDay}
                    onChange={(e) => setLopForm((f) => ({ ...f, halfDay: e.target.checked }))}
                  />
                  Half day
                </label>
              ) : null}
              <label>
                Reason
                <input
                  value={lopForm.reason}
                  onChange={(e) => setLopForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. No-show, unapproved absence — shown to the employee"
                />
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-primary" type="submit" disabled={lopSaving}>
                  {lopSaving ? "Saving…" : editingLopId ? "Save changes" : "Log LOP"}
                </button>
                {editingLopId ? (
                  <button className="btn btn-ghost" type="button" onClick={cancelEditLop} disabled={lopSaving}>
                    Cancel edit
                  </button>
                ) : (
                  <button className="btn btn-ghost" type="button" onClick={closeLopModal} disabled={lopSaving}>
                    Close
                  </button>
                )}
              </div>
            </form>

            <div className="lop-list-wrap">
              <h3 className="lop-list-title">Logged LOP entries</h3>
              {!(lopListFor.get(lopFor) || []).length ? (
                <p className="muted" style={{ fontSize: 13 }}>
                  No LOP entries logged yet.
                </p>
              ) : (
                <ul className="lop-list">
                  {(lopListFor.get(lopFor) || []).map((row) => (
                    <li key={row.id} className="lop-list-item">
                      <div className="lop-list-main">
                        <strong>
                          {row.startDate === row.endDate ? row.startDate : `${row.startDate} → ${row.endDate}`}
                          {row.halfDay ? " · half day" : ""}
                        </strong>
                        {row.reason ? <span className="muted">{row.reason}</span> : null}
                      </div>
                      <div className="lop-list-actions">
                        <button
                          className="btn btn-ghost"
                          type="button"
                          onClick={() => startEditLop(row)}
                          disabled={lopSaving || removingLopId === row.id}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-ghost"
                          type="button"
                          onClick={() => removeLop(row)}
                          disabled={lopSaving || removingLopId === row.id}
                        >
                          {removingLopId === row.id ? "…" : "Remove"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
