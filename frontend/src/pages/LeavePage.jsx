import { useEffect, useState } from "react";
import { LEAVE_NOTICE_DAYS, LEAVE_TYPE_LABELS, LEAVE_TYPE_LIST, PERMISSIONS } from "@twm/shared";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

function pad(n) {
  return String(n).padStart(2, "0");
}

function addDaysYmd(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function minStartForType(leaveType) {
  return addDaysYmd(LEAVE_NOTICE_DAYS[leaveType] || 0);
}

function emptyRequest() {
  return { leaveType: "casual", startDate: minStartForType("casual"), endDate: minStartForType("casual"), reason: "", halfDay: false };
}

function LeaveBalances({ balances }) {
  if (!balances?.items?.length) return null;
  return (
    <div>
      {balances.employeeName ? (
        <p className="leave-balance-who">
          {balances.employeeName} · {balances.year}
        </p>
      ) : null}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }} aria-label="Leave balance">
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
    </div>
  );
}

function emptyQuota(employeeId = "") {
  return { employeeId, casual: 12, paid: 12 };
}

export function LeavePage() {
  const { can, user } = useAuth();
  const [rows, setRows] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyRequest);
  const [quota, setQuota] = useState(emptyQuota());
  const [quotaRows, setQuotaRows] = useState([]);
  const [filterId, setFilterId] = useState("");
  const [tab, setTab] = useState("requests");
  const [balances, setBalances] = useState(null);

  const isHr = can(PERMISSIONS.LEAVE_POLICY_WRITE);
  const myLeaves = rows.filter((row) => row.employeeId === user?.employee?.id);

  async function load() {
    const r = await api("/api/v1/leave?pageSize=100");
    setRows(r.data);
  }

  async function loadQuotas() {
    const year = new Date().getFullYear();
    const r = await api(`/api/v1/leave/entitlements?year=${year}`);
    setQuotaRows(r.data || []);
  }

  async function loadBalances(employeeId) {
    if (!employeeId) {
      setBalances(null);
      return;
    }
    const year = new Date().getFullYear();
    const r = await api(`/api/v1/leave/balances?year=${year}&employeeId=${encodeURIComponent(employeeId)}`);
    setBalances(r);
  }

  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const balanceEmployeeId = isHr && tab === "manage" ? filterId : user?.employee?.id;

  useEffect(() => {
    if (!balanceEmployeeId) return;
    loadBalances(balanceEmployeeId).catch((e) => setError(e.message));
  }, [balanceEmployeeId, rows]);

  useEffect(() => {
    if (!isHr) return;
    Promise.all([api("/api/v1/employees?pageSize=100"), loadQuotas()])
      .then(([r]) => {
        setPeople(r.data);
        const first = r.data[0];
        if (first) setFilterId((id) => id || first.id);
      })
      .catch((e) => setError(e.message));
  }, [isHr]);

  useEffect(() => {
    const row = quotaRows.find((q) => q.employeeId === filterId);
    if (row) {
      setQuota({ employeeId: row.employeeId, casual: row.casual, paid: row.paid });
    } else if (filterId) {
      setQuota(emptyQuota(filterId));
    }
  }, [filterId, quotaRows]);

  return (
    <div className="section-stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Leave</h1>
          <p className="page-sub">Apply, track, and approve time off.</p>
        </div>
      </div>
      <div className="page-tabs" role="tablist" aria-label="Leave sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "requests"}
          className={`page-tab${tab === "requests" ? " on" : ""}`}
          onClick={() => setTab("requests")}
        >
          Requests
        </button>
        {isHr ? (
          <button
            type="button"
            role="tab"
            aria-selected={tab === "manage"}
            className={`page-tab${tab === "manage" ? " on" : ""}`}
            onClick={() => setTab("manage")}
          >
            Leave Management
          </button>
        ) : null}
      </div>
      {error ? <p className="error">{error}</p> : null}
      <LeaveBalances balances={balances} />
      {tab === "requests" ? (
      <div className="card-form-grid">
        <form
          className="card form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              await api("/api/v1/leave", { method: "POST", body: JSON.stringify(form) });
              setForm(emptyRequest());
              await load();
            } catch (err) {
              setError(err.message);
            }
          }}
        >
          <h2>Request leave</h2>
          <p className="muted">Casual leave and unpaid leave must be applied at least 7 days in advance. Sick leave has no notice period.</p>
          <label>
            Type
            <select
              value={form.leaveType}
              onChange={(e) => {
                const leaveType = e.target.value;
                const min = minStartForType(leaveType);
                setForm({
                  ...form,
                  leaveType,
                  startDate: form.startDate && form.startDate < min ? min : form.startDate || min,
                  endDate: form.endDate && form.endDate < min ? min : form.endDate || min,
                });
              }}
            >
              {LEAVE_TYPE_LIST.map((type) => (
                <option key={type} value={type}>
                  {LEAVE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Start
            <input
              type="date"
              min={minStartForType(form.leaveType)}
              value={form.startDate}
              onChange={(e) => {
                const startDate = e.target.value;
                const endDate = form.endDate < startDate ? startDate : form.endDate;
                setForm({ ...form, startDate, endDate, halfDay: startDate === endDate ? form.halfDay : false });
              }}
              required
            />
          </label>
          <label>
            End
            <input
              type="date"
              min={form.startDate || minStartForType(form.leaveType)}
              value={form.endDate}
              onChange={(e) => {
                const endDate = e.target.value;
                setForm({ ...form, endDate, halfDay: form.startDate === endDate && form.startDate ? form.halfDay : false });
              }}
              required
            />
          </label>
          {form.startDate && form.startDate === form.endDate ? (
            <label className="half-day">
              <input
                type="checkbox"
                checked={form.halfDay}
                onChange={(e) => setForm({ ...form, halfDay: e.target.checked })}
              />
              Half day (0.5 days)
            </label>
          ) : null}
          <label>
            Reason
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </label>
          <button className="btn btn-primary" type="submit">
            Submit
          </button>
        </form>
        <div className="card table-card">
          <div className="table-head">
            <h2>My leave requests</h2>
            <span className="spacer" />
            <span className="muted" style={{ fontSize: 12 }}>
              {myLeaves.length} total
            </span>
          </div>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : myLeaves.length === 0 ? (
            <p className="muted">You haven't applied for any leave yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myLeaves.map((row) => (
                    <tr key={row.id}>
                      <td>{LEAVE_TYPE_LABELS[row.leaveType] || row.leaveType}</td>
                      <td>
                        {String(row.startDate).slice(0, 10)} → {String(row.endDate).slice(0, 10)}
                        {row.halfDay ? <span className="row-meta">Half day</span> : null}
                      </td>
                      <td>
                        <span className={`leave-status ${row.status}`}>{row.status.replaceAll("_", " ")}</span>
                        {row.status === "rejected" && row.rejectionReason ? (
                          <p className="muted leave-reject-reason">Reason: {row.rejectionReason}</p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      ) : null}

      {isHr && tab === "manage" ? (
        <section className="leave-mgmt">
          <p className="muted">Set how many casual and sick days each person gets this year. Balances update from these numbers. Unpaid leave has no cap.</p>
          <div className="card-form-grid">
            <form
              className="card form"
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                try {
                  await api("/api/v1/leave/entitlements", {
                    method: "PUT",
                    body: JSON.stringify({
                      employeeId: quota.employeeId || filterId,
                      year: new Date().getFullYear(),
                      casual: Number(quota.casual),
                      paid: Number(quota.paid),
                    }),
                  });
                  await loadQuotas();
                  await load();
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              <h2>Leave allotment</h2>
              <label>
                Person
                <select
                  value={quota.employeeId || filterId}
                  onChange={(e) => setFilterId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Choose
                  </option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.legalName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Casual leaves
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={quota.casual}
                  onChange={(e) => setQuota({ ...quota, casual: e.target.value })}
                  required
                />
              </label>
              <label>
                Sick leaves
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={quota.paid}
                  onChange={(e) => setQuota({ ...quota, paid: e.target.value })}
                  required
                />
              </label>
              <button className="btn btn-primary" type="submit">
                Save allotment
              </button>
            </form>
            <div className="card table-card">
              <div className="table-head">
                <h2>All allotments</h2>
                <span className="spacer" />
                <span className="muted" style={{ fontSize: 12 }}>
                  {quotaRows.length} people
                </span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>Casual</th>
                      <th>Sick</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotaRows.map((row) => (
                      <tr key={row.employeeId}>
                        <td>
                          <button className="btn btn-ghost" type="button" onClick={() => setFilterId(row.employeeId)}>
                            {row.employeeName}
                          </button>
                        </td>
                        <td><strong>{row.casual}</strong></td>
                        <td><strong>{row.paid}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
