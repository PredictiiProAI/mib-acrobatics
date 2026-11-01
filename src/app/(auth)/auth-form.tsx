"use client";

import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { resendCode, signIn, signUp, verifySignupCode, type AuthState } from "./actions";
import { OtpInput } from "./otp-input";

const RESEND_COOLDOWN = 60;

export function Notice({ state }: { state: AuthState }) {
  return (
    <>
      {state?.error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state?.message && !state.error && (
        <p role="status" className="rounded-xl border border-neon-violet/40 bg-neon-violet/10 px-4 py-2 text-sm text-neon-violet">
          {state.message}
        </p>
      )}
    </>
  );
}

/** "Retrimite codul" with a cooldown matching Supabase's per-email rate limit. */
export function ResendButton({ email, kind }: { email: string; kind: "signup" | "recovery" }) {
  const [left, setLeft] = useState(RESEND_COOLDOWN);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return (
    <p className="text-center text-sm text-white/50">
      Nu ai primit codul?{" "}
      <button
        type="button"
        disabled={left > 0 || pending}
        onClick={() =>
          start(async () => {
            const r = await resendCode(email, kind);
            setMsg(r.message);
            if (r.ok) setLeft(RESEND_COOLDOWN);
          })
        }
        className="font-semibold text-neon-violet hover:underline disabled:cursor-not-allowed disabled:text-white/40 disabled:no-underline"
      >
        {left > 0 ? `Retrimite în ${left}s` : "Retrimite codul"}
      </button>
      {msg && <span className="mt-1 block text-xs text-white/60">{msg}</span>}
    </p>
  );
}

function VerifyStep({ start, next, onBack }: { start: AuthState; next?: string; onBack: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(verifySignupCode, start);
  const form = useRef<HTMLFormElement>(null);
  const email = start?.email ?? "";
  return (
    <form ref={form} action={action} className="space-y-5" data-testid="verify-step">
      <div className="space-y-2 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-neon-violet/15 text-neon-violet shadow-neon-sm">
          <MailCheck className="size-7" />
        </span>
        <h1 className="font-display text-2xl font-black">Verifică emailul</h1>
        <p className="text-sm text-white/60">
          Am trimis un cod de 6 cifre la <span className="font-semibold text-white">{email}</span>.
        </p>
      </div>
      <input type="hidden" name="email" value={email} />
      {next && <input type="hidden" name="next" value={next} />}
      <OtpInput disabled={pending} onComplete={() => form.current?.requestSubmit()} />
      <Notice state={state === start ? { message: start?.message } : state} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="size-4 animate-spin" /> : "Confirmă contul"}
      </Button>
      <ResendButton email={email} kind="signup" />
      <button type="button" onClick={onBack} className="mx-auto flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
        <ArrowLeft className="size-4" /> Schimbă emailul
      </button>
    </form>
  );
}

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, undefined);
  const [dismissed, setDismissed] = useState<AuthState>(undefined);
  const isLogin = mode === "login";

  if (state?.step === "verify" && state !== dismissed) return <VerifyStep start={state} next={next} onBack={() => setDismissed(state)} />;

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-black">{isLogin ? "Bine ai revenit" : "Creează cont"}</h1>
        <p className="text-sm text-white/50">{isLogin ? "Intră în comunitatea MIB Acrobatics." : "Alătură-te AcroFeed și vorbește direct cu antrenorul."}</p>
      </div>

      {next && <input type="hidden" name="next" value={next} />}
      {!isLogin && <Input name="full_name" placeholder="Nume complet" autoComplete="name" required maxLength={120} />}
      <Input name="email" type="email" placeholder="Email" autoComplete="email" required defaultValue={state?.email} />
      <Input
        name="password"
        type="password"
        placeholder={isLogin ? "Parolă" : "Parolă (minim 8 caractere)"}
        autoComplete={isLogin ? "current-password" : "new-password"}
        required
        minLength={isLogin ? undefined : 8}
      />
      {isLogin && (
        <div className="-mt-1 text-right">
          <Link href="/forgot-password" className="text-xs font-semibold text-white/50 hover:text-neon-violet">
            Am uitat parola
          </Link>
        </div>
      )}

      <Notice state={state === dismissed ? undefined : state} />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="size-4 animate-spin" /> : isLogin ? "Intră în cont" : "Creează cont"}
      </Button>

      <p className="text-center text-sm text-white/50">
        {isLogin ? "Nu ai cont? " : "Ai deja cont? "}
        <Link href={{ pathname: isLogin ? "/signup" : "/login", query: next ? { next } : undefined }} className="font-semibold text-neon-violet hover:underline">
          {isLogin ? "Creează cont" : "Intră în cont"}
        </Link>
      </p>
    </form>
  );
}
