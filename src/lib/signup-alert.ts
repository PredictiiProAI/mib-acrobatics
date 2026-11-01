import "server-only";
import nodemailer from "nodemailer";
import { FORM_ROLE_LABEL, MEDICAL_FIELDS, type MedicalKey, type WaiverForm } from "@/lib/waiver";

const ALERT_TO = process.env.ADMIN_ALERT_EMAIL || "marius.butrin@gmail.com";
const ALERT_FROM = process.env.ALERT_FROM_EMAIL || "MIB Acrobatics <noreply@smart.siguranta-digitala.ro>";
const SUBJECT = "Un cont nou a fost creat pe platforma MIB Acrobatics";

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function buildMessage(user: { email: string; fullName: string }) {
  const when = new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Bucharest" }).format(new Date());
  const name = user.fullName || "—";
  return {
    subject: SUBJECT,
    text: `${SUBJECT}.\n\nEmail: ${user.email}\nNume: ${name}\nData: ${when}`,
    html: `<p><strong>${SUBJECT}.</strong></p><p>Email: ${escapeHtml(user.email)}<br>Nume: ${escapeHtml(name)}<br>Data: ${escapeHtml(when)}</p>`,
  };
}

type AdminMail = { subject: string; text: string; html: string };

/**
 * Emails the head coach. Never throws.
 * Uses SMTP when SMTP_HOST is set (same server as the Supabase Auth emails), otherwise Resend when RESEND_API_KEY is set.
 */
export async function sendAdminEmail(mail: AdminMail) {
  const msg = { from: ALERT_FROM, to: ALERT_TO, ...mail };
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
      if (!res.ok) console.error("admin email failed", res.status, await res.text());
      return;
    }
    console.warn("admin email skipped: set SMTP_HOST (or RESEND_API_KEY)");
  } catch (e) {
    console.error("admin email failed", e);
  }
}

export const sendSignupAlert = (user: { email: string; fullName: string }) => sendAdminEmail(buildMessage(user));

export function sendWaiverAlert(info: {
  userName: string;
  email: string;
  form: WaiverForm;
  signerName: string;
  childName: string;
  childBirthdate: string;
  emergencyPhone: string;
  emergencySecondary: string;
  medical: Record<MedicalKey, string>;
  signedAt: string;
}) {
  const when = new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeStyle: "medium", timeZone: "Europe/Bucharest" }).format(new Date(info.signedAt));
  const subject = `[AcroMIB] Declarație & Fișă Medicală: ${info.userName} (${FORM_ROLE_LABEL[info.form]})`;
  const sections: [string, [string, string][]][] = [
    [
      "Cont",
      [
        ["Utilizator", info.userName],
        ["Email", info.email],
        ["Rol", FORM_ROLE_LABEL[info.form]],
      ],
    ],
    ...(info.form === "parinte"
      ? ([["Copil", [["Nume complet", info.childName], ["Data nașterii", info.childBirthdate.split("-").reverse().join(".")]]]] as [string, [string, string][]][])
      : []),
    [
      "Contact de urgență",
      [
        ["Telefon principal", info.emergencyPhone],
        ["Contact secundar", info.emergencySecondary || "—"],
      ],
    ],
    ["Fișă medicală", MEDICAL_FIELDS.map((f) => [f.label, info.medical[f.key]] as [string, string])],
    [
      "Semnătură",
      [
        ["Semnat de", info.signerName],
        ["Data și ora", `${when} (ora României)`],
        ["Declarații", "Toate clauzele (riscuri, instrucțiunile antrenorilor, prim ajutor / 112, aptitudine medicală, consimțământ date medicale) au fost bifate."],
      ],
    ],
  ];
  return sendAdminEmail({
    subject,
    text: `${subject}\n\n${sections.map(([title, rows]) => `${title.toUpperCase()}\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}`).join("\n\n")}`,
    html: `<p><strong>${escapeHtml(subject)}</strong></p>${sections
      .map(([title, rows]) => `<h3 style="margin:16px 0 4px">${escapeHtml(title)}</h3><p style="margin:0">${rows.map(([k, v]) => `<strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}`).join("<br>")}</p>`)
      .join("")}`,
  });
}
