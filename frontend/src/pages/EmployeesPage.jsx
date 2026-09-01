import { useEffect, useState } from "react";
import { api } from "../api.js";

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

export function EmployeesPage() {
  const [rows, setRows] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api("/api/v1/employees?pageSize=100"),
      api("/api/v1/attendance/all"),
    ])
      .then(([emps, att]) => {
        setRows(emps.data);
        setAttendance(att.data || []);
        setTotal(emps.meta?.total ?? emps.data.length);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const byId = Object.fromEntries(rows.map((e) => [e.id, e]));

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
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">People</h1>
          <p className="page-sub">
            {loading
              ? "Loading…"
              : `${total ?? rows.length} on the team · today's clock in/out`}
          </p>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="card table-card">
        <div className="table-head">
          <h2>Directory &amp; attendance</h2>
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
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ padding: "20px 22px" }}>
                    Loading directory…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ padding: "20px 22px" }}>
                    No one to show yet.
                  </td>
                </tr>
              ) : (
                rows.map((e) => {
                  const a = attByEmp.get(e.id);
                  const isToday = a?.day === today;
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
                        <span className={`employment-pill ${cls}`}>{status}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
