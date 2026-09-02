import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

export function isMailerConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

// Throws on genuine send failure so callers can tell "couldn't send" apart
// from "recipient doesn't have an account" (the latter never reaches here).
export async function sendMail({ to, subject, text, html }) {
  if (!isMailerConfigured()) {
    // No mailbox configured yet (e.g. local dev) — surface the content
    // instead of failing the request outright.
    console.warn(`[mailer] SMTP not configured — would send to ${to}: ${subject}\n${text}`);
    return;
  }
  await getTransporter().sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
}
