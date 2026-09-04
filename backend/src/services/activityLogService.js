import { getStore } from "../store/index.js";
import { HttpError } from "../utils/httpError.js";

// "2 months" of history, kept simple as a fixed day count rather than
// calendar-month arithmetic (which would make the cutoff drift depending on
// which months it spans).
export const ACTIVITY_RETENTION_DAYS = 60;

// Coarse groupings derived from the `action` string's prefix (e.g.
// "leave.approved" -> "leave") — enough for a useful filter dropdown without
// listing every individual action string.
export const ACTIVITY_CATEGORIES = ["employee", "leave", "payslip", "payment"];

export async function listActivity({ actorEmployeeId, targetEmployeeId, category, from, to, page, pageSize }) {
  if (category && !ACTIVITY_CATEGORIES.includes(category)) {
    throw new HttpError(422, "Unknown activity category");
  }
  const store = getStore();
  const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
  // Inclusive of the whole "to" day, not just its midnight instant.
  const toDate = to ? new Date(`${to}T23:59:59.999Z`) : undefined;
  const { items, total } = await store.listActivity({
    actorEmployeeId: actorEmployeeId || undefined,
    targetEmployeeId: targetEmployeeId || undefined,
    category: category || undefined,
    from: fromDate,
    to: toDate,
    page,
    pageSize,
  });
  return { items, total };
}

// Deletes every audit_logs row (curated or not) older than the retention
// window — run once at boot and once a day after that (see index.js).
export async function purgeOldActivity() {
  const store = getStore();
  const cutoff = new Date(Date.now() - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  return store.deleteAuditOlderThan(cutoff);
}
