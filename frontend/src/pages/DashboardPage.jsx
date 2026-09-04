import { useEffect, useMemo, useState } from "react";
import { LEAVE_TYPE_LABELS, ROLES } from "@twm/shared";
import { useAuth } from "../auth.jsx";
import { api } from "../api.js";
import { SparkIcon, LeaveTypeBadge, fmtDate, leaveTypeLabel } from "../ui.jsx";

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fmtDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function daysInclusive(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

function inMonth(value) {
  const d = new Date(value);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}

function dayKey(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString("en-CA");
}

export function DashboardPage() {
  const { user } = useAuth();
  const name = user?.employee?.legalName || user?.email;
  const roleLabel = user?.employee?.jobTitle || "";
  const isOwner = user?.role === ROLES.OWNER;
  // Org stat cards only for roles the backend gives company-wide leave,
  // attendance, and payslip visibility to (owner / HR). Admins see scoped
  // leave, so company-wide numbers would be wrong for them.
  const canViewOrg = isOwner || user?.role === ROLES.HR;
  const [attendance, setAttendance] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [attendanceAll, setAttendanceAll] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // Ticks so the on-shift elapsed time stays live on the status card.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const att = await api("/api/v1/attendance");
        setAttendance(att);
        const year = new Date().getFullYear();
        // The owner has no one to apply leave to, so there's no leave
        // balance to show on their dashboard.
        const [lvs, bal, org] = await Promise.all([
          api(`/api/v1/leave?pageSize=100`),
          isOwner ? Promise.resolve(null) : api(`/api/v1/leave/balances?year=${year}`),
          canViewOrg
            ? Promise.all([
                api("/api/v1/employees?pageSize=100"),
                api("/api/v1/attendance/all"),
                api("/api/v1/payroll/payslips"),
              ])
            : Promise.resolve(null),
        ]);
        setLeaves(lvs.data || []);
        if (bal) setBalances(bal);
        if (org) {
          const [emps, attAll, slips] = org;
          setEmployees(emps.data || []);
          setAttendanceAll(attAll.data || []);
          setPayslips(slips.data || []);
        }
      } catch (e) {
        setError(e.message);
      }
    }
    load();
  }, [isOwner, canViewOrg]);

  async function punch(path) {
    setBusy(true);
    setError("");
    try {
      const data = await api(path, { method: "POST" });
      setAttendance(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const onShift = Boolean(attendance?.clockedIn);
  const doneToday = Boolean(attendance?.completeForToday);
  const myId = user?.employee?.id;

  const myLeaves = useMemo(() => leaves.filter((l) => l.employeeId === myId), [leaves, myId]);

  // Full-day approved leave blocks clock-in; a half-day leave (of any type —
  // sick, casual, or unpaid) still allows clocking in/out for the rest of the day.
  const onLeaveToday = useMemo(() => {
    const today = new Date().toLocaleDateString("en-CA");
    return myLeaves.some(
      (l) => l.status === "approved" && !l.halfDay && l.startDate <= today && l.endDate >= today,
    );
  }, [myLeaves]);
  const leavesThisMonth = useMemo(
    () =>
      myLeaves
        .filter((l) => l.status === "approved" && (inMonth(l.startDate) || inMonth(l.endDate)))
        .reduce((sum, l) => sum + daysInclusive(l.startDate, l.endDate) * (l.halfDay ? 0.5 : 1), 0),
    [myLeaves],
  );

  const pendingCount = useMemo(
    () => myLeaves.filter((l) => String(l.status).startsWith("pending")).length,
    [myLeaves],
  );

  const totalLeaveRemaining = useMemo(() => {
    if (!balances?.items?.length) return 0;
    return balances.items.reduce((sum, item) => sum + (item.remaining ?? 0), 0);
  }, [balances]);

  // Today's status card: tone drives the dot (live = pulsing green),
  // value is the elapsed/total shift time, trend carries the clock times.
  const shiftInfo = useMemo(() => {
    if (!attendance?.clockInAt) {
      return { tone: "idle", value: "—", trend: "Not clocked in yet" };
    }
    const inAt = new Date(attendance.clockInAt).getTime();
    if (attendance.clockedIn) {
      const mins = Math.max(0, Math.floor((now - inAt) / 60000));
      return {
        tone: "live",
        value: fmtDuration(mins),
        trend: `On shift · in at ${formatTime(attendance.clockInAt)}`,
      };
    }
    const outAt = attendance.clockOutAt ? new Date(attendance.clockOutAt).getTime() : null;
    const mins = outAt ? Math.max(0, Math.round((outAt - inAt) / 60000)) : null;
    return {
      tone: "done",
      value: mins == null ? "—" : fmtDuration(mins),
      trend: `${formatTime(attendance.clockInAt)} → ${formatTime(attendance.clockOutAt)}`,
    };
  }, [attendance, now]);

  const totalLeaveAllotted = useMemo(() => {
    if (!balances?.items?.length) return 0;
    return balances.items.reduce((sum, item) => sum + (item.allotted ?? 0), 0);
  }, [balances]);

  const totalLeaveUsed = useMemo(() => {
    if (!balances?.items?.length) return 0;
    return balances.items.reduce((sum, item) => sum + (item.used ?? 0), 0);
  }, [balances]);

  // Org-wide numbers for company-wide viewers (owner / HR).
  const orgStats = useMemo(() => {
    if (!canViewOrg) return null;
    const today = new Date().toLocaleDateString("en-CA");
    const active = employees.filter((e) => e.employmentStatus === "active").length;
    const total = employees.length;
    // Latest attendance entry per employee, preferring today's — same as People page.
    const latest = new Map();
    for (const a of attendanceAll) {
      const day = dayKey(a.clockInAt);
      const prev = latest.get(a.employeeId);
      if (!prev || (day === today && prev.day !== today) || a.clockInAt >= prev.clockInAt) {
        latest.set(a.employeeId, { ...a, day });
      }
    }
    let onShiftNow = 0;
    let clockedInToday = 0;
    for (const a of latest.values()) {
      if (a.day !== today) continue;
      clockedInToday += 1;
      if (a.clockInAt && !a.clockOutAt) onShiftNow += 1;
    }
    const onLeaveToday = new Set(
      leaves
        .filter((l) => l.status === "approved" && l.startDate <= today && l.endDate >= today)
        .map((l) => l.employeeId),
    ).size;
    const pendingApprovals = leaves.filter((l) => String(l.status).startsWith("pending")).length;
    const month = today.slice(0, 7);
    const payslipsThisMonth = payslips.filter((p) => String(p.period).slice(0, 7) === month).length;
    return { active, total, onShiftNow, clockedInToday, onLeaveToday, pendingApprovals, payslipsThisMonth };
  }, [canViewOrg, employees, attendanceAll, leaves, payslips]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">
            {greet()} {name}
            {roleLabel ? <span> · {roleLabel}</span> : null}
          </p>
        </div>
        <span className="spacer" />
      </div>

      {error ? <p className="error" style={{ marginBottom: 12 }}>{error}</p> : null}

      <div className="dashboard-stack">
        {/* Quick clock in/out — kept at the top so it's the first thing anyone acts on */}
        <article className="card" style={{ maxWidth: 560 }}>
          <h2>Quick clock in / out</h2>
          <div className="quick-action">
            {onShift ? (
              <button
                className="btn btn-danger"
                type="button"
                disabled={busy}
                onClick={() => punch("/api/v1/attendance/clock-out")}
              >
                {busy ? "…" : "Clock out"}
              </button>
            ) : doneToday ? (
              <button className="btn" type="button" disabled>
                Day complete
              </button>
            ) : onLeaveToday ? (
              <button className="btn" type="button" disabled title="You're on approved leave today">
                On leave today
              </button>
            ) : (
              <button
                className="btn btn-accent"
                type="button"
                disabled={busy}
                onClick={() => punch("/api/v1/attendance/clock-in")}
              >
                {busy ? "…" : "Clock in"}
              </button>
            )}
            <div className="qa-time">
              <span>In</span>
              <strong>{formatTime(attendance?.clockInAt)}</strong>
            </div>
            <div className="qa-time">
              <span>Out</span>
              <strong>{formatTime(attendance?.clockOutAt)}</strong>
            </div>
            {attendance?.today?.length > 0 ? (
              <span className="muted" style={{ fontSize: 12 }}>
                {attendance.today.length} {attendance.today.length === 1 ? "entry" : "entries"} today
              </span>
            ) : null}
          </div>
          {onLeaveToday && !doneToday ? (
            <p className="muted" style={{ fontSize: 12, margin: "10px 0 0" }}>
              You're on approved leave today, so clock in is disabled. Half-day leave still allows clocking in/out.
            </p>
          ) : null}
        </article>

        {/* Org-wide stats — owner / HR only */}
        {orgStats ? (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            <article className="stat-card amber">
              <div className="stat-icon">
                <SparkIcon
                  d={
                    <>
                      <circle cx="12" cy="13" r="8" />
                      <path d="M12 9.5v3.5l2.5 2.5" />
                      <path d="M9.5 2h5" />
                    </>
                  }
                />
              </div>
              <span className="stat-value">
                {orgStats.onShiftNow}
                <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-muted)" }}>
                  {" / "}
                  {orgStats.total}
                </span>
              </span>
              <span className="stat-label">On shift now</span>
              <span className="stat-trend">{orgStats.clockedInToday} clocked in today</span>
            </article>
            <article className="stat-card">
              <div className="stat-icon">
                <SparkIcon
                  d={
                    <>
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M3 10h18" />
                      <path d="M9.5 13.5l5 5M14.5 13.5l-5 5" />
                    </>
                  }
                />
              </div>
              <span className="stat-value">{orgStats.onLeaveToday}</span>
              <span className="stat-label">On leave today</span>
              <span className="stat-trend">Approved time off</span>
            </article>
            <article className="stat-card">
              <div className="stat-icon">
                <SparkIcon d={<path d="M4 6h16M4 12h16M4 18h10" />} />
              </div>
              <span className="stat-value">{orgStats.pendingApprovals}</span>
              <span className="stat-label">Pending approvals</span>
              <span className="stat-trend">Leave awaiting decision</span>
            </article>
            <article className="stat-card">
              <div className="stat-icon">
                <SparkIcon
                  d={
                    <>
                      <circle cx="9" cy="8" r="3.5" />
                      <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
                      <circle cx="17" cy="9" r="2.5" />
                      <path d="M15.5 15.6c2.5.4 4.4 2 5 4.4" />
                    </>
                  }
                />
              </div>
              <span className="stat-value">{orgStats.active}</span>
              <span className="stat-label">Active employees</span>
              <span className="stat-trend">{orgStats.total - orgStats.active} inactive</span>
            </article>
            <article className="stat-card">
              <div className="stat-icon">
                <SparkIcon
                  d={
                    <>
                      <rect x="2" y="6" width="20" height="13" rx="2" />
                      <circle cx="12" cy="12.5" r="3" />
                    </>
                  }
                />
              </div>
              <span className="stat-value">{orgStats.payslipsThisMonth}</span>
              <span className="stat-label">Payslips this month</span>
              <span className="stat-trend">
                {new Date().toLocaleDateString([], { month: "long", year: "numeric" })}
              </span>
            </article>
          </div>
        ) : null}

        {/* KPI stat cards */}
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
          <article
            className={`stat-card amber${shiftInfo.tone === "live" ? " status-live" : ""}`}
            style={isOwner ? { maxWidth: 230 } : undefined}
          >
            <div className="stat-icon">
              <SparkIcon
                d={
                  <path d="M12 8v5l3 2" />
                }
              />
            </div>
            <span className="stat-label">Today's status</span>
            <span className="stat-value status-value">
              <span className={`status-dot ${shiftInfo.tone}`} aria-hidden="true" />
              {shiftInfo.value}
            </span>
            <span className="stat-trend">{shiftInfo.trend}</span>
          </article>
          {isOwner ? null : (
            <>
              <article className="stat-card">
                <div className="stat-icon">
                  <SparkIcon d={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /></>} />
                </div>
                <span className="stat-value">{leavesThisMonth || 0}</span>
                <span className="stat-label">Leave days (this month)</span>
                <span className="stat-trend">Approved leaves</span>
              </article>
              <article className="stat-card">
                <div className="stat-icon">
                  <SparkIcon d={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>} />
                </div>
                <span className="stat-value">{pendingCount}</span>
                <span className="stat-label">My pending requests</span>
                <span className="stat-trend">Waiting on approval</span>
              </article>
              <article className="stat-card amber">
                <div className="stat-icon">
                  <SparkIcon d={<><path d="M12 3l2.5 5 5.5.5-4 4 1 5.5-5-3-5 3 1-5.5-4-4 5.5-.5z" /></>} />
                </div>
                <span className="stat-value">{totalLeaveRemaining}</span>
                <span className="stat-label">Total leave days left</span>
                <span className="stat-trend">
                  {totalLeaveAllotted
                    ? `${totalLeaveUsed} used of ${totalLeaveAllotted}`
                    : "Across all leave types"}
                </span>
              </article>
            </>
          )}
        </div>

        {isOwner ? null : (
        <>
        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", alignItems: "stretch" }}
        >
        {/* My leave balance */}
        <article className="card">
          <div className="table-head" style={{ padding: 0, marginBottom: 14 }}>
            <h2>My leave balance</h2>
            <span className="spacer" />
            <span className="muted" style={{ fontSize: 12 }}>
              {balances?.year || new Date().getFullYear()} · {balances?.employeeName || name}
            </span>
          </div>
          {!balances?.items?.length ? (
            <p className="muted">No leave balance available yet.</p>
          ) : (
            <div
              className="grid"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
            >
              {balances.items.map((item) => {
                const allotted = item.allotted || 0;
                const used = item.used || 0;
                const remaining = item.remaining ?? Math.max(allotted - used, 0);
                const pct = allotted ? Math.min(100, Math.round((used / allotted) * 100)) : 0;
                return (
                  <div key={item.leaveType} className="balance-card">
                    <h3>{item.label || LEAVE_TYPE_LABELS[item.leaveType] || item.leaveType}</h3>
                    <p className="balance-remain">
                      {remaining == null ? "Unlimited" : `${remaining} left`}
                    </p>
                    <p className="balance-meta">
                      {allotted ? `${used} used of ${allotted}` : "No yearly cap"}
                      {item.pending ? ` · ${item.pending} pending` : ""}
                    </p>
                    {allotted ? (
                      <div className="balance-bar" aria-hidden="true">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </article>

        {/* My recent leave requests */}
        <article className="card">
          <div className="table-head" style={{ padding: 0, marginBottom: 4 }}>
            <h2>My recent leave requests</h2>
            <span className="spacer" />
            <span className="muted" style={{ fontSize: 12 }}>
              {myLeaves.length} total
            </span>
          </div>
          {myLeaves.length === 0 ? (
            <p className="muted" style={{ padding: "18px 2px 2px" }}>
              You haven’t applied for any leave yet.
            </p>
          ) : (
            <ul className="leave-list">
              {myLeaves.slice(0, 5).map((l) => {
                const days = daysInclusive(l.startDate, l.endDate) * (l.halfDay ? 0.5 : 1);
                return (
                  <li key={l.id} className="leave-item">
                    <LeaveTypeBadge type={l.leaveType} />
                    <div className="leave-item-main">
                      <strong>{leaveTypeLabel(l)}</strong>
                      <span className="leave-item-dates">
                        {fmtDate(l.startDate)} → {fmtDate(l.endDate)} ·{" "}
                        {l.halfDay ? "half day" : `${days} ${days === 1 ? "day" : "days"}`}
                      </span>
                      {l.isLop && l.reason ? (
                        <span className="leave-item-note">Reason: {l.reason}</span>
                      ) : null}
                      {l.status === "rejected" && l.rejectionReason ? (
                        <span className="leave-item-reject">{l.rejectionReason}</span>
                      ) : null}
                    </div>
                    <span className={`leave-status ${l.status}`}>
                      {String(l.status).replaceAll("_", " ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 5) return "Working late,";
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
}
