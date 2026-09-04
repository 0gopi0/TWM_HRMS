// Small shared UI bits used across pages (dashboard, leave).
import { LEAVE_TYPE_LABELS } from "@twm/shared";

// Admin-logged LOP entries (leaveType "unpaid" + isLop) display as "LOP"
// instead of the generic "Unpaid leave" label, so they read as loss-of-pay
// records rather than something the employee applied for themselves.
export function leaveTypeLabel(row) {
  if (row?.isLop) return "LOP";
  return LEAVE_TYPE_LABELS[row?.leaveType] || row?.leaveType;
}

export function SparkIcon({ d, size = 18 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d}
    </svg>
  );
}

export const LEAVE_TYPE_ICONS = {
  sick: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  casual: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M19.1 4.9l-2.2 2.2M7.1 16.9l-2.2 2.2" />
    </>
  ),
  unpaid: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M14.8 9.3c0-1.3-1.25-2.3-2.8-2.3s-2.8 1-2.8 2.3c0 2.9 5.6 1.7 5.6 4.6 0 1.3-1.25 2.3-2.8 2.3s-2.8-1-2.8-2.3" />
    </>
  ),
};

export function LeaveTypeBadge({ type, size = 18 }) {
  return (
    <span className={`leave-type-badge ${type}`} aria-hidden="true">
      <SparkIcon size={size} d={LEAVE_TYPE_ICONS[type] || LEAVE_TYPE_ICONS.casual} />
    </span>
  );
}

export function fmtDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  const opts = { day: "numeric", month: "short" };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString([], opts);
}
