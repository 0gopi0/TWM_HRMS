import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { getStore } from "../store/index.js";
import { hashToken } from "../store/seedData.js";
import { sendMail } from "./mailerService.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

// Per-email throttle, separate from the route's per-IP rate limiter — an
// attacker with many IPs shouldn't be able to inbox-bomb one address.
// In-memory is fine at this app's scale (same tradeoff as the in-memory
// store fallback and express-rate-limit's default in-process store).
const recentRequests = new Map();
const EMAIL_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_MAX_REQUESTS = 3;

function tooManyForEmail(email) {
  const now = Date.now();
  const hits = (recentRequests.get(email) || []).filter((t) => now - t < EMAIL_WINDOW_MS);
  hits.push(now);
  recentRequests.set(email, hits);
  return hits.length > EMAIL_MAX_REQUESTS;
}

// Always resolves (never reveals whether the email has an account) UNLESS
// the mailer itself genuinely fails to send — that's a system fact, true
// regardless of which email was requested, so it's safe to surface as an
// error without leaking per-address registration status.
export async function requestPasswordReset(email) {
  const normalized = email.trim().toLowerCase();
  if (tooManyForEmail(normalized)) return;

  const store = getStore();
  const user = await store.findUserByEmail(normalized);
  if (!user || !user.isActive) return;

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const ttlMinutes = env.PASSWORD_RESET_TOKEN_TTL_MINUTES;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await store.createPasswordResetToken({ id: randomUUID(), userId: user.id, tokenHash, expiresAt });

  const resetUrl = `${env.CLIENT_ORIGIN}/reset-password?token=${rawToken}`;
  await sendMail({
    to: user.email,
    subject: "Reset your TWM HRMS password",
    text:
      `Someone requested a password reset for this account. This link expires in ${ttlMinutes} minutes ` +
      `and can only be used once:\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    html:
      `<p>Someone requested a password reset for this account. This link expires in ${ttlMinutes} minutes ` +
      `and can only be used once:</p><p><a href="${resetUrl}">${resetUrl}</a></p>` +
      `<p>If you didn't request this, you can ignore this email.</p>`,
  });
}

export async function checkResetToken(rawToken) {
  const store = getStore();
  const row = await store.getPasswordResetToken(hashToken(rawToken));
  return Boolean(row && !row.usedAt && new Date(row.expiresAt) > new Date());
}

export async function resetPassword(rawToken, newPassword) {
  const store = getStore();
  const tokenHash = hashToken(rawToken);
  const row = await store.getPasswordResetToken(tokenHash);
  if (!row || row.usedAt || new Date(row.expiresAt) < new Date()) {
    throw new HttpError(400, "This reset link is invalid or has expired");
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await store.updateUserPassword(row.userId, passwordHash);
  await store.markPasswordResetTokenUsed(tokenHash);
  // Signing out every existing session is the whole point of a reset — an
  // attacker who had a stolen session shouldn't survive the password change.
  await store.revokeAllRefreshTokens(row.userId);
}
