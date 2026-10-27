/** Romanian messages for Supabase Auth error codes (https://supabase.com/docs/guides/auth/debugging/error-codes). */
const MESSAGES: Record<string, string> = {
  invalid_credentials: "Email sau parolă greșită.",
  email_not_confirmed: "Emailul nu este confirmat încă.",
  user_already_exists: "Există deja un cont cu acest email. Autentifică-te.",
  email_exists: "Există deja un cont cu acest email. Autentifică-te.",
  weak_password: "Parola este prea slabă. Folosește cel puțin 8 caractere, cu litere și cifre.",
  same_password: "Parola nouă trebuie să fie diferită de cea veche.",
  otp_expired: "Codul este greșit sau a expirat. Cere un cod nou.",
  otp_disabled: "Autentificarea cu cod nu este activă.",
  over_email_send_rate_limit: "Ai cerut prea multe coduri. Așteaptă un minut și încearcă din nou.",
  over_request_rate_limit: "Prea multe încercări. Așteaptă puțin și încearcă din nou.",
  email_address_invalid: "Adresa de email nu este validă.",
  email_address_not_authorized: "Nu putem trimite emailuri la această adresă.",
  signup_disabled: "Înregistrările sunt momentan dezactivate.",
  user_not_found: "Nu există niciun cont cu acest email.",
  session_not_found: "Sesiunea a expirat. Autentifică-te din nou.",
  validation_failed: "Datele introduse nu sunt valide.",
};

type AuthErrorLike = { code?: string; status?: number; message?: string };

const SMTP_HINT = " Eroare la trimiterea emailului: verifică setările SMTP din Supabase (Authentication → Emails → SMTP) și Logs → Auth pentru mesajul exact.";

/** Romanian message for known codes; anything else (e.g. SMTP failures) shows Supabase's raw message so it can be debugged. */
export function authErrorRo(error: AuthErrorLike | null | undefined, fallback = "A apărut o eroare. Încearcă din nou.") {
  if (!error) return fallback;
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (error.status === 429) return MESSAGES.over_request_rate_limit;
  const detail = [error.code, error.status, error.message].filter(Boolean).join(" · ");
  const smtp = /sending .*email|smtp/i.test(error.message ?? "") ? SMTP_HINT : "";
  return detail ? `${fallback} Detalii: ${detail}.${smtp}` : fallback;
}
