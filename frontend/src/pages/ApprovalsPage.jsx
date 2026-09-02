import { useEffect, useState } from "react";
import { LEAVE_TYPE_LABELS } from "@twm/shared";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export function ApprovalsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(null); // { id, reason }
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const r = await api("/api/v1/leave?pageSize=100");
    setRows(r.data || []);
  }

  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
    </div>
  );
}
