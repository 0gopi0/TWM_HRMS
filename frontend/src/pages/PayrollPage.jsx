import { useEffect, useMemo, useState } from "react";
import { PAYROLL_OPERATOR_EMPLOYEE_IDS, PERMISSIONS } from "@twm/shared";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { downloadPayslipPdf } from "../services/payslipPdf.js";

const PAYROLL_OPERATORS = new Set(PAYROLL_OPERATOR_EMPLOYEE_IDS);

const PF_TAX_AMOUNT = 200;
const PF_TAX_THRESHOLD = 25000;

// No payroll is generated for these people (top of the house / co-founder level).
const EXCLUDED_FROM_PAYROLL = new Set(["emp-manoj", "emp-chai"]);

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function fmtInr(n) {
  return `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function newEmptyExtra() {
  return { label: "", amount: "" };
}

function daysInMonth(period) {
  const [y, m] = String(period).split("-").map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
}

// Approved unpaid-leave (LOP) days for `employeeId` that overlap `period`
// (YYYY-MM) — same "full days, or 0.5 for a half-day single-day leave" rule
// used for leave balances, whatever the source (self-applied or admin-logged).
function lopDaysInPeriod(leaveRows, employeeId, period) {
  const [y, m] = String(period).split("-").map(Number);
  if (!y || !m) return 0;
  const periodStart = new Date(y, m - 1, 1);
  const periodEnd = new Date(y, m, 0);
  let total = 0;
  for (const row of leaveRows) {
    if (row.employeeId !== employeeId) continue;
    if (row.leaveType !== "unpaid" || row.status !== "approved") continue;
    const start = new Date(`${row.startDate}T00:00:00`);
    const end = new Date(`${row.endDate}T00:00:00`);
    const s = start < periodStart ? periodStart : start;
    const e = end > periodEnd ? periodEnd : end;
    if (e < s) continue;
    total += row.halfDay ? 0.5 : Math.round((e - s) / 86400000) + 1;
  }
  return total;
}

export function PayrollPage() {
  const { can, user } = useAuth();
  const [rows, setRows] = useState([]);
  const [people, setPeople] = useState([]);
  const [leaveRows, setLeaveRows] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [period, setPeriod] = useState(currentPeriod());
  const [baseSalary, setBaseSalary] = useState("");
  const [extras, setExtras] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [runningPayment, setRunningPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const isHr = can(PERMISSIONS.PAYROLL_WRITE_COMPANY);
  // Narrower than the PAYROLL_WRITE_COMPANY permission: only Chai and
  // Nagendra (accounting) may create payslips or run payment.
  const canOperatePayroll = PAYROLL_OPERATORS.has(user?.employee?.id);

  async function load() {
    const slips = await api("/api/v1/payroll/payslips");
    setRows(slips.data);
    if (isHr) {
      const emps = await api("/api/v1/employees?pageSize=100");
      setPeople(emps.data);
      const selectable = emps.data.filter((p) => !EXCLUDED_FROM_PAYROLL.has(p.id));
      if (!employeeId && selectable[0]) setEmployeeId(selectable[0].id);
    }
    if (canOperatePayroll) {
      const leave = await api("/api/v1/leave?pageSize=500");
      setLeaveRows(leave.data || []);
    }
  }

  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const base = round2(baseSalary || 0);

  const lopDays = useMemo(
    () => (employeeId && period ? lopDaysInPeriod(leaveRows, employeeId, period) : 0),
    [leaveRows, employeeId, period],
  );
  // Per-day rate off the base salary alone, capped so it can never exceed
  // the base — a month entirely on unpaid leave zeroes it out, not less.
  const lopDeduction = useMemo(() => {
    if (!lopDays || base <= 0) return 0;
    const perDay = round2(base / daysInMonth(period));
    return Math.min(base, round2(perDay * lopDays));
  }, [lopDays, base, period]);

  const total = useMemo(() => {
    const lines = extras.map((x) => ({
      label: x.label.trim(),
      amount: round2(x.amount || 0),
    }));
    if (lopDeduction > 0) {
      lines.push({
        label: `LOP deduction (${lopDays} day${lopDays === 1 ? "" : "s"} unpaid leave)`,
        amount: -lopDeduction,
        isLop: true,
      });
    }
    const gross = Math.max(0, round2(base + lines.reduce((s, l) => s + l.amount, 0)));
    const pf = gross >= PF_TAX_THRESHOLD ? PF_TAX_AMOUNT : 0;
    return { lines, gross, pf, net: round2(gross - pf) };
  }, [base, extras, lopDeduction, lopDays]);

  function setExtraAt(i, patch) {
    setExtras((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  async function removePayslip(r) {
    if (!window.confirm(`Delete the ${r.period} payslip? This can't be undone.`)) return;
    setError("");
    setDeletingId(r.id);
    try {
      await api(`/api/v1/payroll/payslips/${r.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId("");
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!employeeId) {
      setError("Select an employee.");
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(period)) {
      setError("Period must be in YYYY-MM format (e.g. 2026-08).");
      return;
    }
    if (baseSalary === "" || base === 0) {
      setError("Enter a base salary greater than 0.");
      return;
    }
    const lines = total.lines.filter((l) => l.label && l.amount !== 0);
    for (const l of lines) {
      if (l.isLop) continue; // computed from approved LOP days, not user-entered
      if (!Number.isFinite(l.amount) || l.amount < 0) {
        setError(`"${l.label}" has an invalid amount.`);
        return;
      }
    }
    setSaving(true);
    try {
      await api("/api/v1/payroll/payslips", {
        method: "POST",
        body: JSON.stringify({
          employeeId,
          period,
          baseSalary: base,
          extras: lines.map(({ label, amount }) => ({ label, amount })),
        }),
      });
      setNotice("Payslip created.");
      setBaseSalary("");
      setExtras([]);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Pay</h1>
          <p className="page-sub">
            {canOperatePayroll
              ? "Add a monthly payslip: base salary plus any extras like travel or bonuses."
              : isHr
                ? "Payslip creation and payment runs are handled by Chai and Nagendra."
                : "Your payslips only."}
          </p>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="success">{notice}</p> : null}
      {canOperatePayroll ? (
        <form className="card form form-wide payroll-form" onSubmit={submit}>
          <h2>Create payslip</h2>
          <div className="payroll-grid">
            <label>
              Employee
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
                {people
                  .filter((p) => !EXCLUDED_FROM_PAYROLL.has(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.legalName}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Period
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                required
              />
            </label>
            <label>
              Base salary (₹)
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="e.g. 22000"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="payroll-extras">
            <div className="payroll-extras-head">
              <span>Extra amounts</span>
              <span className="muted">travel, bonus, overtime…</span>
            </div>
            {extras.length === 0 ? (
              <p className="muted payroll-extras-empty">No extras yet — add one below.</p>
            ) : (
              <ul className="payroll-extra-rows">
                {extras.map((x, i) => (
                  <li key={i} className="payroll-extra-row">
                    <input
                      type="text"
                      placeholder="e.g. Travel expenses"
                      value={x.label}
                      maxLength={120}
                      onChange={(e) => setExtraAt(i, { label: e.target.value })}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="Amount"
                      value={x.amount}
                      onChange={(e) => setExtraAt(i, { amount: e.target.value })}
                    />
                    <button
                      type="button"
                      className="icon-btn payroll-extra-remove"
                      aria-label="Remove extra"
                      onClick={() => setExtras((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setExtras((prev) => [...prev, newEmptyExtra()])}
            >
              + Add amount
            </button>
          </div>

          <div className="payroll-totals">
            <div className="payroll-total-row">
              <span>Base salary</span>
              <span>{fmtInr(base)}</span>
            </div>
            {total.lines
              .filter((l) => l.label && l.amount !== 0)
              .map((l, i) => (
                <div className="payroll-total-row" key={i}>
                  <span>{l.label}</span>
                  <span className={l.amount < 0 ? "pf-minus" : undefined}>
                    {l.amount < 0 ? `− ${fmtInr(Math.abs(l.amount))}` : fmtInr(l.amount)}
                  </span>
                </div>
              ))}
            <div className="payroll-total-row payroll-total-row--gross">
              <span>Gross</span>
              <span>{fmtInr(total.gross)}</span>
            </div>
            <div
              className="payroll-total-row payroll-total-row--pf"
              title={`PF tax of ₹200 is deducted automatically when gross is ${fmtInr(PF_TAX_THRESHOLD)} or more`}
            >
              <span>
                PF / tax {total.pf > 0 ? <em>(gross ≥ ₹25,000)</em> : <em>(waived, gross &lt; ₹25,000)</em>}
              </span>
              <span className={total.pf > 0 ? "pf-minus" : "pf-zero"}>
                {total.pf > 0 ? `− ${fmtInr(total.pf)}` : fmtInr(0)}
              </span>
            </div>
            <div className="payroll-total-row payroll-total-row--net">
              <span>Net pay</span>
              <span>{fmtInr(total.net)}</span>
            </div>
          </div>

          <div className="row-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Create payslip"}
            </button>
            <button
              className="btn"
              type="button"
              disabled={runningPayment}
              onClick={async () => {
                if (!window.confirm(`Run the payment for ${period}? This pays every payslip issued for that period.`)) {
                  return;
                }
                setError("");
                setNotice("");
                setRunningPayment(true);
                try {
                  await api("/api/v1/payroll/payments", {
                    method: "POST",
                    headers: { "Idempotency-Key": `pay-${period}` },
                  });
                  setNotice(`Payment run started for ${period}.`);
                } catch (err) {
                  setError(err.message);
                } finally {
                  setRunningPayment(false);
                }
              }}
            >
              {runningPayment ? "Running…" : "Run payment"}
            </button>
          </div>
        </form>
      ) : isHr ? (
        <p className="muted">Only Chai and Nagendra can create payslips or run payment.</p>
      ) : (
        <p className="muted">Salary amounts for other people are never shown to this role.</p>
      )}
      <div className="card table-card">
        <div className="table-head">
          <h2>Payslips</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Employee</th>
                <th>Base</th>
                <th>Extras</th>
                <th>PF</th>
                <th>Net</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ padding: "20px 22px" }}>
                    Loading payslips…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ padding: "20px 22px" }}>
                    No payslips yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const emp = people.find((p) => p.id === r.employeeId);
                  const isOwn = user?.employee?.id === r.employeeId;
                  const own = user?.employee;
                  const name = emp
                    ? emp.legalName
                    : isOwn
                      ? own?.legalName || "You"
                      : "—";
                  const extraCount = (r.extras ?? []).length;
                  const doc = {
                    employeeName: emp ? emp.legalName : own?.legalName,
                    employeeNumber: emp ? emp.employeeNumber : own?.employeeNumber,
                    jobTitle: emp ? emp.jobTitle : own?.jobTitle,
                    period: r.period,
                    extras: r.extras ?? [],
                    pfTax: r.pfTax,
                    baseAmount: r.baseAmount,
                    grossAmount: r.grossAmount,
                    netAmount: r.netAmount,
                  };
                  return (
                    <tr key={r.id}>
                      <td><strong>{r.period}</strong></td>
                      <td>{name}</td>
                      <td>{r.baseAmount != null ? fmtInr(r.baseAmount) : "hidden"}</td>
                      <td>
                        {r.extras != null && r.extras.length
                          ? (() => {
                              const diff = round2(r.grossAmount - r.baseAmount);
                              return `${extraCount} item${extraCount > 1 ? "s" : ""} (${diff < 0 ? "−" : "+"}${fmtInr(Math.abs(diff))})`;
                            })()
                          : "—"}
                      </td>
                      <td>{r.pfTax ? fmtInr(r.pfTax) : "—"}</td>
                      <td>{r.netAmount != null ? fmtInr(r.netAmount) : "hidden"}</td>
                      <td className="payroll-download-cell">
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button
                            className="btn btn-ghost payroll-download"
                            type="button"
                            title={`Download payslip ${r.period}`}
                            onClick={() => downloadPayslipPdf(doc).catch((e) => setError(e.message))}
                          >
                            ↓ PDF
                          </button>
                          {canOperatePayroll ? (
                            <button
                              className="btn btn-ghost"
                              type="button"
                              title={`Delete payslip ${r.period}`}
                              disabled={deletingId === r.id}
                              onClick={() => removePayslip(r)}
                            >
                              {deletingId === r.id ? "…" : "Delete"}
                            </button>
                          ) : null}
                        </div>
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
