import "server-only";

const RESEND_URL = process.env.RESEND_API_URL || "https://api.resend.com/emails";
const ALERT_TO = process.env.ADMIN_ALERT_EMAIL || "marius.butrin@gmail.com";
const ALERT_FROM = process.env.ALERT_FROM_EMAIL || "MIB Acrobatics <onboarding@resend.dev>";

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Emails the head coach that a new account was created (Resend). Never throws; skipped without RESEND_API_KEY. */
export async function sendSignupAlert(user: { email: string; fullName: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("signup alert skipped: RESEND_API_KEY is not set");
    return;
  }
  const when = new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Bucharest" }).format(new Date());
  const name = user.fullName || "—";
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: ALERT_FROM,
        to: [ALERT_TO],
        subject: "Un cont nou a fost creat",
        text: `Un cont nou a fost creat pe MIB Acrobatics.\n\nNume: ${name}\nEmail: ${user.email}\nData: ${when}`,
        html: `<p><strong>Un cont nou a fost creat</strong> pe MIB Acrobatics.</p><p>Nume: ${escapeHtml(name)}<br>Email: ${escapeHtml(user.email)}<br>Data: ${escapeHtml(when)}</p>`,
      }),
    });
    if (!res.ok) console.error("signup alert failed", res.status, await res.text());
  } catch (e) {
    console.error("signup alert failed", e);
  }
}
