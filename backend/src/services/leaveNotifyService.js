import { LEAVE_TYPE_LABELS } from "@twm/shared";
import { getStore } from "../store/index.js";
import { sendMail } from "./mailerService.js";
import { env } from "../config/env.js";

// Both notifiers take plain, already-formatted primitives (not raw store
// rows) — callers in leaveService.js pass startDate/endDate through their
// own asYmd() first. This keeps this module import-cycle-free (it never
// needs to import leaveService.js) and avoids leaking a raw Date object
// from mysqlStore.updateLeaveStatus() into an email body.

function formatRange(startDate, endDate) {
  return startDate === endDate ? startDate : `${startDate} to ${endDate}`;
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
      subject: `New leave request from ${applicantName}`,
      text:
        `${applicantName} has requested ${typeLabel}${halfDay ? " (half day)" : ""} for ${range}.\n\n` +
        `Reason: ${reason || "—"}\n\n` +
        `Review it here: ${url}`,
      html:
        `<p>${applicantName} has requested <strong>${typeLabel}</strong>${halfDay ? " (half day)" : ""} for ${range}.</p>` +
        `<p>Reason: ${reason || "—"}</p>` +
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
    const reasonHtml = decision === "rejected" && comment ? `<p>Reason: ${comment}</p>` : "";
    await sendMail({
      to: applicantUser.email,
      subject: `Your ${typeLabel} request was ${verb}`,
      text:
        `Your ${typeLabel}${halfDay ? " (half day)" : ""} request for ${range} has been ${verb} by ${decidedBy}.` +
        `${reasonLine}\n\nView it here: ${url}`,
      html:
        `<p>Your <strong>${typeLabel}</strong>${halfDay ? " (half day)" : ""} request for ${range} has been <strong>${verb}</strong> by ${decidedBy}.</p>` +
        `${reasonHtml}<p><a href="${url}">View it here</a></p>`,
    });
  } catch (err) {
    console.error("[leaveNotify] failed to send decision-notification email:", err);
  }
}
