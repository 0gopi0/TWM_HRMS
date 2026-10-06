import { LEAVE_TYPE_LABELS, LEAVE_TYPES } from "@twm/shared";
import { getStore } from "../store/index.js";
import { sendMail } from "./mailerService.js";
import { env } from "../config/env.js";

// All notifiers take plain, already-formatted primitives (not raw store
// rows) — callers in leaveService.js pass startDate/endDate through their
// own asYmd() first. This keeps this module import-cycle-free (it never
// needs to import leaveService.js) and avoids leaking a raw Date object
// from mysqlStore.updateLeaveStatus() into an email body.

function formatRange(startDate, endDate) {
  return startDate === endDate ? startDate : `${startDate} to ${endDate}`;
}

// What to call the request in a subject line.
function requestNoun(leaveType) {
  return leaveType === LEAVE_TYPES.WFH ? "work from home" : "leave";
}

// Reasons and rejection comments are free text typed by employees — escape
// them (and names) so they can't inject markup into the HTML part.
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Fire-and-forget: never throws, so a mail outage can never break apply/decide.
export async function notifyLeaveApplied({ applicantName, approverId, leaveType, startDate, endDate, halfDay, reason }) {
  try {
    const store = getStore();
    const approver = await store.getEmployeeById(approverId);
    if (!approver) {
      console.warn(`[leaveNotify] approver ${approverId} not found — skipping apply email`);
      return;
    }
    const approverUser = await store.findUserById(approver.userId);
    if (!approverUser?.email) {
      console.warn(`[leaveNotify] approver ${approverId} has no user/email — skipping apply email`);
      return;
    }
    const typeLabel = LEAVE_TYPE_LABELS[leaveType] || leaveType;
    const range = formatRange(startDate, endDate);
    const url = `${env.CLIENT_ORIGIN}/approvals`;
    await sendMail({
      to: approverUser.email,
      subject: `New ${requestNoun(leaveType)} request from ${applicantName}`,
      text:
        `${applicantName} has requested ${typeLabel}${halfDay ? " (half day)" : ""} for ${range}.\n\n` +
        `Reason: ${reason || "—"}\n\n` +
        `Review it here: ${url}`,
      html:
        `<p>${escapeHtml(applicantName)} has requested <strong>${typeLabel}</strong>${halfDay ? " (half day)" : ""} for ${range}.</p>` +
        `<p>Reason: ${escapeHtml(reason || "—")}</p>` +
        `<p><a href="${url}">Review it here</a></p>`,
    });
  } catch (err) {
    console.error("[leaveNotify] failed to send apply-notification email:", err);
  }
}

export async function notifyLeaveDecided({
  applicantUserId,
  applicantName,
  decision,
  decidedBy,
  leaveType,
  startDate,
  endDate,
  halfDay,
  comment,
}) {
  try {
    if (!applicantUserId) {
      console.warn("[leaveNotify] no applicant user id — skipping decision email");
      return;
    }
    const store = getStore();
    const applicantUser = await store.findUserById(applicantUserId);
    if (!applicantUser?.email) {
      console.warn(`[leaveNotify] applicant user ${applicantUserId} has no email — skipping decision email`);
      return;
    }
    const typeLabel = LEAVE_TYPE_LABELS[leaveType] || leaveType;
    const range = formatRange(startDate, endDate);
    const url = `${env.CLIENT_ORIGIN}/leave`;
    const verb = decision === "approved" ? "approved" : "rejected";
    const reasonLine = decision === "rejected" && comment ? `\n\nReason: ${comment}` : "";
    const reasonHtml = decision === "rejected" && comment ? `<p>Reason: ${escapeHtml(comment)}</p>` : "";
    await sendMail({
      to: applicantUser.email,
      subject: `Your ${typeLabel} request was ${verb}`,
      text:
        `Your ${typeLabel}${halfDay ? " (half day)" : ""} request for ${range} has been ${verb} by ${decidedBy}.` +
        `${reasonLine}\n\nView it here: ${url}`,
      html:
        `<p>Your <strong>${typeLabel}</strong>${halfDay ? " (half day)" : ""} request for ${range} has been <strong>${verb}</strong> by ${escapeHtml(decidedBy)}.</p>` +
        `${reasonHtml}<p><a href="${url}">View it here</a></p>`,
    });
  } catch (err) {
    console.error("[leaveNotify] failed to send decision-notification email:", err);
  }
}

// Copies HR (LEAVE_APPROVAL_NOTIFY_EMAILS) on every approved leave or
// work-from-home request. The applicant already gets their own email above
// and the approver made the call, so neither is copied even when they're on
// the HR list. decidedBy is null for requests that approve themselves (the
// owner has no one above them).
export async function notifyLeaveApprovedToHr({
  applicantUserId,
  applicantName,
  approverUserId,
  decidedBy,
  leaveType,
  startDate,
  endDate,
  halfDay,
  reason,
}) {
  try {
    const store = getStore();
    const [applicantUser, approverUser] = await Promise.all([
      applicantUserId ? store.findUserById(applicantUserId) : null,
      approverUserId ? store.findUserById(approverUserId) : null,
    ]);
    const skip = new Set(
      [applicantUser?.email, approverUser?.email].filter(Boolean).map((email) => email.toLowerCase()),
    );
    const to = env.LEAVE_APPROVAL_NOTIFY_EMAILS.filter((email) => !skip.has(email.toLowerCase()));
    if (to.length === 0) return;
    const typeLabel = LEAVE_TYPE_LABELS[leaveType] || leaveType;
    const range = formatRange(startDate, endDate);
    const url = `${env.CLIENT_ORIGIN}/calendar`;
    const by = decidedBy ? ` by ${decidedBy}` : " automatically";
    await sendMail({
      to,
      subject: `${typeLabel} approved for ${applicantName}`,
      text:
        `${applicantName}'s ${typeLabel}${halfDay ? " (half day)" : ""} request for ${range} has been approved${by}.\n\n` +
        `Reason: ${reason || "—"}\n\n` +
        `See the team calendar: ${url}`,
      html:
        `<p>${escapeHtml(applicantName)}'s <strong>${typeLabel}</strong>${halfDay ? " (half day)" : ""} request for ${range} has been <strong>approved</strong>${escapeHtml(by)}.</p>` +
        `<p>Reason: ${escapeHtml(reason || "—")}</p>` +
        `<p><a href="${url}">See the team calendar</a></p>`,
    });
  } catch (err) {
    console.error("[leaveNotify] failed to send HR approval email:", err);
  }
}
