import { useEffect, useState } from "react";
import { LEAVE_NOTICE_DAYS, LEAVE_TYPE_LABELS, LEAVE_TYPE_LIST, PERMISSIONS } from "@twm/shared";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { LeaveTypeBadge, fmtDate } from "../ui.jsx";

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

function daysInclusive(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
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
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
        aria-label="Leave balance"
      >
        {balances.items.map((item) => {
          const allotted = item.allotted || 0;
          const used = item.used || 0;
          const remaining = item.remaining ?? Math.max(allotted - used, 0);
          const pct = allotted ? Math.min(100, Math.round((used / allotted) * 100)) : 0;
          return (
            <div key={item.leaveType} className="balance-card">
              <div className="balance-head">
                <LeaveTypeBadge type={item.leaveType} size={15} />
                <h3>{item.label || LEAVE_TYPE_LABELS[item.leaveType] || item.leaveType}</h3>
              </div>
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

// Owners/co-founders aren't part of leave allotment management (same
// exclusion as payroll — top of the house doesn't get a leave quota).
const EXCLUDED_FROM_LEAVE_MANAGEMENT = new Set(["emp-manoj", "emp-chai"]);

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
        const selectable = r.data.filter((p) => !EXCLUDED_FROM_LEAVE_MANAGEMENT.has(p.id));
        setPeople(selectable);
        const first = selectable[0];
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
      {tab === "requests" ? (
      <div className="leave-grid">
        <div className="leave-main">
          <LeaveBalances balances={balances} />
          <div className="card leave-history">
            <div className="table-head" style={{ padding: 0, marginBottom: 4 }}>
              <h2>My leave requests</h2>
              <span className="spacer" />
              <span className="muted" style={{ fontSize: 12 }}>
                {myLeaves.length} total
              </span>
            </div>
            {loading ? (
              <p className="muted" style={{ padding: "18px 2px 2px" }}>Loading…</p>
            ) : myLeaves.length === 0 ? (
              <p className="muted" style={{ padding: "18px 2px 2px" }}>You haven't applied for any leave yet.</p>
            ) : (
              <ul className="leave-list">
                {myLeaves.map((row) => {
                  const days = daysInclusive(row.startDate, row.endDate) * (row.halfDay ? 0.5 : 1);
                  return (
                    <li key={row.id} className="leave-item">
                      <LeaveTypeBadge type={row.leaveType} />
                      <div className="leave-item-main">
                        <strong>{LEAVE_TYPE_LABELS[row.leaveType] || row.leaveType}</strong>
                        <span className="leave-item-dates">
                          {fmtDate(row.startDate)} → {fmtDate(row.endDate)} ·{" "}
                          {row.halfDay ? "half day" : `${days} ${days === 1 ? "day" : "days"}`}
                        </span>
                        {row.status === "rejected" && row.rejectionReason ? (
                          <span className="leave-item-reject">Reason: {row.rejectionReason}</span>
                        ) : null}
                      </div>
                      <span className={`leave-status ${row.status}`}>{row.status.replaceAll("_", " ")}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        <form
          className="card form leave-form"
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
          <p className="muted leave-form-note">
            Casual and unpaid leave must be applied at least 7 days in advance. Sick leave has no notice period.
          </p>
          <div className="seg" role="group" aria-label="Leave type">
            {LEAVE_TYPE_LIST.map((type) => (
              <button
                key={type}
                type="button"
                title={LEAVE_TYPE_LABELS[type]}
                className={`seg-btn${form.leaveType === type ? " on" : ""}`}
                onClick={() => {
                  const min = minStartForType(type);
                  setForm({
                    ...form,
                    leaveType: type,
                    startDate: form.startDate && form.startDate < min ? min : form.startDate || min,
                    endDate: form.endDate && form.endDate < min ? min : form.endDate || min,
                  });
                }}
              >
                {LEAVE_TYPE_LABELS[type].replace(" leave", "")}
              </button>
            ))}
          </div>
          <div className="date-row">
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
          </div>
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
          <button className="btn btn-primary" type="submit" style={{ width: "100%" }}>
            Submit request
          </button>
        </form>
      </div>
      ) : null}

      {isHr && tab === "manage" ? (
        <>
          <LeaveBalances balances={balances} />
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
                  {quotaRows.filter((row) => !EXCLUDED_FROM_LEAVE_MANAGEMENT.has(row.employeeId)).length} people
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
                    {quotaRows
                      .filter((row) => !EXCLUDED_FROM_LEAVE_MANAGEMENT.has(row.employeeId))
                      .map((row) => (
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
        </>
      ) : null}
    </div>
  );
}
