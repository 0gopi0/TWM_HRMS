import { useEffect, useState } from "react";
import { LEAVE_TYPE_LABELS, PERMISSIONS } from "@twm/shared";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function nowHHmm() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function teamStatusLabel(row) {
  if (row.dayOff) return row.dayOff.label ? `Day off · ${row.dayOff.label}` : "Day off";
  if (row.onLeaveToday) return "On leave today";
  if (row.clockedIn) return `Clocked in @ ${formatTime(row.clockInAt)}`;
  if (row.completeForToday) return `Clocked out @ ${formatTime(row.clockOutAt)}`;
  return "Not clocked in";
}

export function ApprovalsPage() {
  const { user, can } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(null); // { id, reason }
  const [busyId, setBusyId] = useState(null);

  const canClockTeam = can(PERMISSIONS.ATTENDANCE_CLOCK_TEAM);
  const [team, setTeam] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [clockingId, setClockingId] = useState(null);
  const [timeDrafts, setTimeDrafts] = useState({});

  async function load() {
    const r = await api("/api/v1/leave?pageSize=100");
    setRows(r.data || []);
  }

  async function loadTeam() {
    const r = await api("/api/v1/attendance/team");
    setTeam(r.data || []);
  }

  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!canClockTeam) {
      setTeamLoading(false);
      return;
    }
    loadTeam()
      .catch((e) => setError(e.message))
      .finally(() => setTeamLoading(false));
  }, [canClockTeam]);

  async function clockInFor(employeeId) {
    const time = timeDrafts[employeeId] || nowHHmm();
    setError("");
    setClockingId(employeeId);
    try {
      await api(`/api/v1/attendance/${employeeId}/clock-in-for`, {
        method: "POST",
        body: JSON.stringify({ clockInTime: time }),
      });
      await loadTeam();
    } catch (err) {
      setError(err.message);
    } finally {
      setClockingId(null);
    }
  }

  const teamRows = team.filter((row) => row.employeeId !== user?.employee?.id);

  const approvals = rows.filter(
    (row) => row.status?.startsWith("pending") && row.approverEmployeeId === user?.employee?.id,
  );

  async function decide(id, decision, comment) {
    setError("");
    setBusyId(id);
    try {
      await api(`/api/v1/leave/${id}/decide`, {
        method: "POST",
        body: JSON.stringify(comment ? { decision, comment } : { decision }),
      });
      setRejecting(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Approvals</h1>
          <p className="page-sub">
            {approvals.length} request{approvals.length === 1 ? "" : "s"} waiting on your decision
          </p>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="card table-card">
        <div className="table-head">
          <h2>Pending decisions</h2>
        </div>
        {loading ? (
          <p className="muted" style={{ padding: "24px 22px" }}>Loading…</p>
        ) : approvals.length === 0 ? (
          <p className="muted" style={{ padding: "24px 22px" }}>No requests waiting on you right now.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Reason</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {approvals.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.employeeName || "—"}</strong></td>
                    <td>{LEAVE_TYPE_LABELS[row.leaveType] || row.leaveType}</td>
                    <td>
                      {String(row.startDate).slice(0, 10)} → {String(row.endDate).slice(0, 10)}
                      {row.halfDay ? <span className="row-meta">Half day</span> : null}
                    </td>
                    <td>{row.reason || "—"}</td>
                    <td className="row-actions">
                      {rejecting?.id === row.id ? (
                        <form
                          className="approval-reject-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            decide(row.id, "rejected", rejecting.reason.trim() || undefined);
                          }}
                        >
                          <input
                            autoFocus
                            type="text"
                            maxLength={512}
                            placeholder="Reason for rejection (optional)"
                            value={rejecting.reason}
                            onChange={(e) => setRejecting({ id: row.id, reason: e.target.value })}
                            disabled={busyId === row.id}
                          />
                          <button className="btn btn-danger" type="submit" disabled={busyId === row.id}>
                            {busyId === row.id ? "…" : "Confirm reject"}
                          </button>
                          <button
                            className="btn btn-ghost"
                            type="button"
                            onClick={() => setRejecting(null)}
                            disabled={busyId === row.id}
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <>
                          <button
                            className="btn btn-primary"
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => decide(row.id, "approved")}
                          >
                            {busyId === row.id ? "…" : "Approve"}
                          </button>
                          <button
                            className="btn btn-danger"
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => setRejecting({ id: row.id, reason: "" })}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {canClockTeam ? (
        <div className="card table-card">
          <div className="table-head">
            <h2>Team attendance</h2>
          </div>
          {teamLoading ? (
            <p className="muted" style={{ padding: "24px 22px" }}>Loading…</p>
          ) : teamRows.length === 0 ? (
            <p className="muted" style={{ padding: "24px 22px" }}>No team members to show.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {teamRows.map((row) => {
                    const canClockIn =
                      !row.clockedIn && !row.completeForToday && !row.onLeaveToday && !row.dayOff;
                    return (
                      <tr key={row.employeeId}>
                        <td><strong>{row.employeeName}</strong></td>
                        <td>{teamStatusLabel(row)}</td>
                        <td className="row-actions">
                          {canClockIn ? (
                            <>
                              <input
                                type="time"
                                value={timeDrafts[row.employeeId] ?? nowHHmm()}
                                onChange={(e) =>
                                  setTimeDrafts((prev) => ({ ...prev, [row.employeeId]: e.target.value }))
                                }
                                disabled={clockingId === row.employeeId}
                              />
                              <button
                                className="btn btn-primary"
                                type="button"
                                disabled={clockingId === row.employeeId}
                                onClick={() => clockInFor(row.employeeId)}
                              >
                                {clockingId === row.employeeId ? "…" : "Clock in"}
                              </button>
                            </>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
