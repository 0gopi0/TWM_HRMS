import { useEffect, useState } from "react";
import { api } from "../api.js";

const CATEGORY_LABELS = {
  employee: "Employee",
  leave: "Leave",
  payslip: "Payslip",
  payment: "Payment",
};

function emptyFilters() {
  return { actorEmployeeId: "", targetEmployeeId: "", category: "", from: "", to: "" };
}

function fmtWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function ActivityLogPage() {
  const [people, setPeople] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/employees?pageSize=100")
      .then((r) => setPeople(r.data || []))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (filters.actorEmployeeId) params.set("actorEmployeeId", filters.actorEmployeeId);
    if (filters.targetEmployeeId) params.set("targetEmployeeId", filters.targetEmployeeId);
    if (filters.category) params.set("category", filters.category);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    setLoading(true);
    setError("");
    api(`/api/v1/activity?${params}`)
      .then((r) => {
        setRows(r.data || []);
        setMeta(r.meta || { total: 0, totalPages: 0 });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters, page]);

  function setFilter(patch) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Activity Log</h1>
          <p className="page-sub">
            Who did what, and to whom — payslips, leave decisions, LOP entries, and employee changes.
          </p>
        </div>
      </div>

      <article className="card activity-filters">
        <div className="activity-filters-grid">
          <label>
            Person
            <select value={filters.actorEmployeeId} onChange={(e) => setFilter({ actorEmployeeId: e.target.value })}>
              <option value="">Anyone</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.legalName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Affected person
            <select value={filters.targetEmployeeId} onChange={(e) => setFilter({ targetEmployeeId: e.target.value })}>
              <option value="">Anyone</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.legalName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select value={filters.category} onChange={(e) => setFilter({ category: e.target.value })}>
              <option value="">All activity</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            From
            <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter({ from: e.target.value })} />
          </label>
          <label>
            To
            <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter({ to: e.target.value })} />
          </label>
          {hasFilters ? (
            <button
              className="btn btn-ghost activity-clear"
              type="button"
              onClick={() => {
                setFilters(emptyFilters());
                setPage(1);
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </article>

      {error ? <p className="error" style={{ marginTop: 12 }}>{error}</p> : null}

      <div className="card table-card" style={{ marginTop: 16 }}>
        <div className="table-head">
          <h2>Activity</h2>
          <span className="spacer" />
          <span className="muted" style={{ fontSize: 12 }}>
            {meta.total} entr{meta.total === 1 ? "y" : "ies"} · kept for 60 days
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Type</th>
                <th>What happened</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="muted" style={{ padding: "20px 22px" }}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted" style={{ padding: "20px 22px" }}>
                    {hasFilters ? "No activity matches these filters." : "No activity recorded yet."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>
                      {fmtWhen(row.createdAt)}
                    </td>
                    <td>
                      <span className={`activity-cat activity-cat--${row.action?.split(".")[0]}`}>
                        {CATEGORY_LABELS[row.action?.split(".")[0]] || row.action}
                      </span>
                    </td>
                    <td>{row.summary}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {meta.totalPages > 1 ? (
          <div className="activity-pager">
            <button className="btn btn-ghost" type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ‹ Previous
            </button>
            <span className="muted" style={{ fontSize: 12 }}>
              Page {meta.page} of {meta.totalPages}
            </span>
            <button
              className="btn btn-ghost"
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next ›
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
