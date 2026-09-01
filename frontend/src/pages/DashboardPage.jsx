import { useEffect, useMemo, useState } from "react";
import { LEAVE_TYPE_LABELS, ROLES } from "@twm/shared";
import { useAuth } from "../auth.jsx";
import { api } from "../api.js";

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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

function SparkIcon({ d, size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d}
    </svg>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const name = user?.employee?.legalName || user?.email;
  const roleLabel = user?.employee?.jobTitle || "";
  const isOwner = user?.role === ROLES.OWNER;
  const [attendance, setAttendance] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const att = await api("/api/v1/attendance");
        setAttendance(att);
        // The owner has no one to apply leave to, so there's no leave
        // balance or history to show on their dashboard.
        if (isOwner) return;
        const year = new Date().getFullYear();
        const [lvs, bal] = await Promise.all([
          api(`/api/v1/leave?pageSize=100`),
          api(`/api/v1/leave/balances?year=${year}`),
        ]);
        setLeaves(lvs.data || []);
        setBalances(bal);
      } catch (e) {
        setError(e.message);
      }
    }
    load();
  }, [isOwner]);

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

  const todayStatus = onShift ? "In" : doneToday ? "Out" : "—";
  const todayStatusLabel = onShift
    ? "On shift"
    : doneToday
      ? "Day complete"
      : "Not started";

  const totalLeaveAllotted = useMemo(() => {
    if (!balances?.items?.length) return 0;
    return balances.items.reduce((sum, item) => sum + (item.allotted ?? 0), 0);
  }, [balances]);

  const totalLeaveUsed = useMemo(() => {
    if (!balances?.items?.length) return 0;
    return balances.items.reduce((sum, item) => sum + (item.used ?? 0), 0);
  }, [balances]);

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
        {/* KPI stat cards */}
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
          <article className="stat-card amber">
            <div className="stat-icon">
              <SparkIcon
                d={
                  <path d="M12 8v5l3 2" />
                }
              />
            </div>
            <span className="stat-value">{todayStatus}</span>
            <span className="stat-label">Today's status</span>
            <span className="stat-trend">{todayStatusLabel}</span>
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

        {/* Quick clock in/out */}
        <article className="card">
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
        </article>

        {/* My recent leave requests */}
        {isOwner ? null : (
        <>
        <article className="card table-card">
          <div className="table-head">
            <h2>My recent leave requests</h2>
            <span className="spacer" />
            <span className="muted" style={{ fontSize: 12 }}>
              {myLeaves.length} total
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Dates</th>
                  <th style={{ width: 140 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {myLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted" style={{ padding: "20px 22px" }}>
                      You haven’t applied for any leave yet.
                    </td>
                  </tr>
                ) : (
                  myLeaves.slice(0, 5).map((l) => (
                    <tr key={l.id}>
                      <td>{LEAVE_TYPE_LABELS[l.leaveType] || l.leaveType}</td>
                      <td>
                        {String(l.startDate).slice(0, 10)} → {String(l.endDate).slice(0, 10)}
                        {l.halfDay ? <span className="row-meta">Half day</span> : null}
                      </td>
                      <td>
                        <span className={`leave-status ${l.status}`}>
                          {String(l.status).replaceAll("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

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
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
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
