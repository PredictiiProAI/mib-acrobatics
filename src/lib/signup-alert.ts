import "server-only";
import nodemailer from "nodemailer";
import { FORM_ROLE_LABEL, MEDICAL_FIELDS, WAIVER_TITLE, type MedicalKey } from "@/lib/waiver";

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
 * Sends one email. Never throws.
 * Uses SMTP when SMTP_HOST is set (same server as the Supabase Auth emails), otherwise Resend when RESEND_API_KEY is set.
 */
export async function sendEmail(to: string, mail: AdminMail) {
  const msg = { from: ALERT_FROM, to, ...mail };
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

/** Emails the head coach. */
export const sendAdminEmail = (mail: AdminMail) => sendEmail(ALERT_TO, mail);

/** Reminds a member (sent from Admin → Utilizatori) to complete the parental consent or the gym rules. */
export function sendDocumentsRequest(info: { to: string; name: string; parent: boolean }) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://mib-acrobatics.vercel.app").replace(/\/$/, "");
  const url = `${site}/documente`;
  const doc = info.parent ? "Acordul parental & Fișa medicală" : "Regulamentul & Siguranța Sportiv AcroMIB";
  const subject = `[AcroMIB] Te rugăm să completezi ${doc}`;
  const hello = info.name ? `Bună, ${info.name}!` : "Bună!";
  const body = info.parent
    ? "Antrenorii MIB Acrobatics îți cer să completezi acordul parental și fișa medicală a copilului. Fără ele, copilul nu poate participa la antrenamente. Durează aproximativ 2 minute."
    : "Antrenorii MIB Acrobatics îți cer să citești și să accepți regulamentul de siguranță din sală.";
  return sendEmail(info.to, {
    subject,
    text: `${hello}\n\n${body}\n\nCompletează aici: ${url}\n\nEchipa AcroMIB`,
    html: `<div style="background:#000;padding:24px;font-family:Arial,sans-serif;color:#fff"><div style="max-width:480px;margin:0 auto;background:#111;border-radius:16px;padding:24px">
<img src="${site}/logo.png" alt="AcroMIB" width="120" style="display:block;margin:0 auto 16px">
<p style="margin:0 0 4px;color:#39ff14;font-size:12px;font-weight:700;letter-spacing:3px">MIB ACROBATICS</p>
<h1 style="margin:0 0 12px;font-size:20px">${escapeHtml(doc)}</h1>
<p style="margin:0 0 8px">${escapeHtml(hello)}</p><p style="margin:0 0 20px;color:#ffffffcc">${escapeHtml(body)}</p>
<a href="${url}" style="display:inline-block;background:#ff6a00;color:#000;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:12px">Completează acum</a>
<p style="margin:20px 0 0;color:#ffffff80;font-size:12px">Echipa AcroMIB</p></div></div>`,
  });
}

export const sendSignupAlert = (user: { email: string; fullName: string }) => sendAdminEmail(buildMessage(user));

export function sendWaiverAlert(info: {
  id: string;
  edited: boolean;
  userName: string;
  email: string;
  signerName: string;
  childName: string;
  childBirthdate: string;
  emergencyPhone: string;
  emergencySecondary: string;
  medical: Record<MedicalKey, string>;
  signedAt: string;
}) {
  const when = new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeStyle: "medium", timeZone: "Europe/Bucharest" }).format(new Date(info.signedAt));
  const role = FORM_ROLE_LABEL.parinte;
  const subject = `[AcroMIB] Declarație & Fișă Medicală: ${info.userName} (${role})${info.edited ? " — actualizare" : ""}`;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://mib-acrobatics.vercel.app").replace(/\/$/, "");
  const docUrl = `${site}/declaratie/${info.id}`;
  const sections: [string, [string, string][]][] = [
    [
      info.edited ? "Fișă medicală actualizată" : "Fișă medicală nouă",
      [
        ["Document", `${WAIVER_TITLE} nr. ${info.id.slice(0, 8).toUpperCase()}`],
        ["PDF", docUrl],
      ],
    ],
    [
      "Cont părinte",
      [
        ["Utilizator", info.userName],
        ["Email", info.email],
        ["Rol", role],
      ],
    ],
    ["Copil", [["Nume complet", info.childName], ["Data nașterii", info.childBirthdate.split("-").reverse().join(".")]]],
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
        ["Declarații", "Toate clauzele (riscuri, instrucțiunile antrenorilor, prim ajutor / 112, aptitudine medicală, consimțământ date medicale, părinte / tutore legal) au fost bifate."],
      ],
    ],
  ];
  return sendAdminEmail({
    subject,
    text: `${subject}\n\n${sections.map(([title, rows]) => `${title.toUpperCase()}\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}`).join("\n\n")}`,
    html: `<p><strong>${escapeHtml(subject)}</strong></p><p><a href="${escapeHtml(docUrl)}">Vezi / descarcă PDF-ul fișei</a></p>${sections
      .map(([title, rows]) => `<h3 style="margin:16px 0 4px">${escapeHtml(title)}</h3><p style="margin:0">${rows.map(([k, v]) => `<strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}`).join("<br>")}</p>`)
      .join("")}`,
  });
}
