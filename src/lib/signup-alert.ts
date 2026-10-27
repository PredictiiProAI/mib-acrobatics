import "server-only";
import nodemailer from "nodemailer";

const ALERT_TO = process.env.ADMIN_ALERT_EMAIL || "marius.butrin@gmail.com";
const ALERT_FROM = process.env.ALERT_FROM_EMAIL || "MIB Acrobatics <noreply@smart.siguranta-digitala.ro>";
const SUBJECT = "Un cont nou a fost creat pe platforma MIB Acrobatics";

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function buildMessage(user: { email: string; fullName: string }) {
  const when = new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Bucharest" }).format(new Date());
  const name = user.fullName || "—";
  return {
    from: ALERT_FROM,
    to: ALERT_TO,
    subject: SUBJECT,
    text: `${SUBJECT}.\n\nEmail: ${user.email}\nNume: ${name}\nData: ${when}`,
    html: `<p><strong>${SUBJECT}.</strong></p><p>Email: ${escapeHtml(user.email)}<br>Nume: ${escapeHtml(name)}<br>Data: ${escapeHtml(when)}</p>`,
  };
}

/**
 * Emails the head coach that a new account was created. Never throws.
 * Uses SMTP when SMTP_HOST is set (same server as the Supabase Auth emails), otherwise Resend when RESEND_API_KEY is set.
 */
export async function sendSignupAlert(user: { email: string; fullName: string }) {
  const msg = buildMessage(user);
  try {
    if (process.env.SMTP_HOST) {
      const port = Number(process.env.SMTP_PORT || 587);
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
      });
      await transport.sendMail(msg);
      return;
    }
    if (process.env.RESEND_API_KEY) {
      const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...msg, to: [msg.to] }),
      });
      if (!res.ok) console.error("signup alert failed", res.status, await res.text());
      return;
    }
    console.warn("signup alert skipped: set SMTP_HOST (or RESEND_API_KEY)");
  } catch (e) {
    console.error("signup alert failed", e);
  }
}
