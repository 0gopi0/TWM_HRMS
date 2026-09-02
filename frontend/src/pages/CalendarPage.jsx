import { useEffect, useMemo, useState } from "react";
import { HOLIDAY_KINDS, PERMISSIONS } from "@twm/shared";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pad(n) {
  return String(n).padStart(2, "0");
}

function ymd(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function todayYmd() {
  const n = new Date();
  return ymd(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

function monthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
}

function shiftMonth(year, month, delta) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function buildCells(year, month) {
  const first = new Date(year, month - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const last = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let day = 1; day <= last; day += 1) {
    cells.push({ day, date: ymd(year, month, day) });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function CalendarPage() {
  const { can } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState({ holidays: [], leaves: [] });
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(todayYmd());
  const [form, setForm] = useState({
    name: "",
    date: todayYmd(),
    kind: HOLIDAY_KINDS.FESTIVAL,
  });

  async function load(y, m) {
    const r = await api(`/api/v1/calendar?year=${y}&month=${m}`);
    setData(r);
  }

  useEffect(() => {
    load(year, month).catch((e) => setError(e.message));
  }, [year, month]);

  const cells = useMemo(() => buildCells(year, month), [year, month]);
  const today = todayYmd();
  const canWrite = can(PERMISSIONS.LEAVE_POLICY_WRITE);

  const dayHolidays = (data.holidays || []).filter((h) => h.date === selected);
  const dayLeaves = (data.leaves || []).filter((l) => l.startDate <= selected && l.endDate >= selected);

  function eventsOn(date) {
    return {
      holidays: (data.holidays || []).filter((h) => h.date === date),
      leaves: (data.leaves || []).filter((l) => l.startDate <= date && l.endDate >= date),
    };
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-sub">Who is off, festival holidays, and optional holidays for the team.</p>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}

      <div className="cal-layout">
        <article className="card cal-board">
          <div className="cal-toolbar">
            <button
              className="icon-btn"
              type="button"
              aria-label="Previous month"
              onClick={() => {
                const next = shiftMonth(year, month, -1);
                setYear(next.year);
                setMonth(next.month);
              }}
            >
              ‹
            </button>
            <h2>{monthLabel(year, month)}</h2>
            <button
              className="icon-btn"
              type="button"
              aria-label="Next month"
              onClick={() => {
                const next = shiftMonth(year, month, 1);
                setYear(next.year);
                setMonth(next.month);
              }}
            >
              ›
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setYear(now.getFullYear());
                setMonth(now.getMonth() + 1);
                setSelected(todayYmd());
              }}
            >
              Today
            </button>
          </div>
          <div className="cal-grid" role="grid" aria-label={monthLabel(year, month)}>
            {WEEKDAYS.map((d) => (
              <div key={d} className="cal-dow">
                {d}
              </div>
            ))}
            {cells.map((cell, i) => {
              if (!cell) return <div key={`empty-${i}`} className="cal-cell empty" />;
              const { holidays, leaves } = eventsOn(cell.date);
              const isToday = cell.date === today;
              const isSelected = cell.date === selected;
              return (
                <button
                  key={cell.date}
                  type="button"
                  className={`cal-cell${isToday ? " today" : ""}${isSelected ? " selected" : ""}`}
                  onClick={() => {
                    setSelected(cell.date);
                    setForm((f) => ({ ...f, date: cell.date }));
                  }}
                >
                  <span className="cal-daynum">{cell.day}</span>
                  <ul className="cal-marks">
                    {holidays.map((h) => (
                      <li key={h.id} className={`cal-mark ${h.kind}`}>
                        {h.name}
                      </li>
                    ))}
                    {leaves.map((l) => (
                      <li key={l.id} className="cal-mark leave">
                        {l.name}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
          <div className="cal-legend">
            <span>
              <i className="cal-swatch festival" /> Festival
            </span>
            <span>
              <i className="cal-swatch optional" /> Optional
            </span>
            <span>
              <i className="cal-swatch leave" /> On leave
            </span>
          </div>
        </article>

        <div className="cal-side">
          <article className="card">
            <h2>{selected}</h2>
            {dayHolidays.length === 0 && dayLeaves.length === 0 ? (
              <p className="muted">Nothing marked on this day.</p>
            ) : null}
            {dayHolidays.map((h) => (
              <p key={h.id} className={`cal-detail ${h.kind}`}>
                <strong>{h.kind === "optional" ? "Optional" : "Festival"}</strong> {h.name}
              </p>
            ))}
            {dayLeaves.map((l) => (
              <p key={l.id} className="cal-detail leave">
                <strong>{l.name}</strong> on {l.leaveType} leave
                {l.startDate !== l.endDate ? ` (${l.startDate} → ${l.endDate})` : ""}
              </p>
            ))}
          </article>

          {canWrite ? (
            <form
              className="card form"
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                try {
                  await api("/api/v1/calendar/holidays", { method: "POST", body: JSON.stringify(form) });
                  setForm({ name: "", date: selected, kind: HOLIDAY_KINDS.FESTIVAL });
                  await load(year, month);
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              <h2>Add holiday</h2>
              <label>
                Name
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Diwali"
                  required
                />
              </label>
              <label>
                Date
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </label>
              <label>
                Kind
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                  <option value={HOLIDAY_KINDS.FESTIVAL}>Festival</option>
                  <option value={HOLIDAY_KINDS.OPTIONAL}>Optional</option>
                </select>
              </label>
              <button className="btn btn-primary" type="submit">
                Save
              </button>
            </form>
          ) : (
            <p className="muted">HR can add festival and optional holidays here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
