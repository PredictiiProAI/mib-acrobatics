"use client";

import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, Input } from "@/components/ui";
import { requestPasswordReset, resetPassword, type AuthState } from "../actions";
import { Notice, ResendButton } from "../auth-form";
import { OtpInput } from "../otp-input";

function NewPasswordStep({ start, onBack }: { start: AuthState; onBack: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPassword, start);
  const email = start?.email ?? "";
  return (
    <form action={action} className="space-y-5" data-testid="reset-step">
      <div className="space-y-1 text-center">
        <h1 className="font-display text-2xl font-black">Alege o parolă nouă</h1>
        <p className="text-sm text-white/60">
          Introdu codul de 6 cifre trimis la <span className="font-semibold text-white">{email}</span>.
        </p>
      </div>
      <input type="hidden" name="email" value={email} />
      <OtpInput disabled={pending} />
      <Input name="password" type="password" placeholder="Parolă nouă (minim 8 caractere)" autoComplete="new-password" required minLength={8} />
      <Input name="password_confirm" type="password" placeholder="Repetă parola nouă" autoComplete="new-password" required minLength={8} />
      <Notice state={state === start ? { message: start?.message } : state} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="size-4 animate-spin" /> : "Schimbă parola"}
      </Button>
      <ResendButton email={email} kind="recovery" />
      <button type="button" onClick={onBack} className="mx-auto flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
        <ArrowLeft className="size-4" /> Schimbă emailul
      </button>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, undefined);
  const [dismissed, setDismissed] = useState<AuthState>(undefined);
  if (state?.step === "reset" && state !== dismissed) return <NewPasswordStep start={state} onBack={() => setDismissed(state)} />;
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <span className="grid size-12 place-items-center rounded-2xl bg-neon-violet/15 text-neon-violet shadow-neon-sm">
          <KeyRound className="size-6" />
        </span>
        <h1 className="font-display text-2xl font-black">Am uitat parola</h1>
        <p className="text-sm text-white/50">Îți trimitem pe email un cod de 6 cifre ca să alegi o parolă nouă.</p>
      </div>
      <Input name="email" type="email" placeholder="Email" autoComplete="email" required defaultValue={state?.email} />
      <Notice state={state === dismissed ? undefined : state} />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="size-4 animate-spin" /> : "Trimite codul"}
      </Button>
      <p className="text-center text-sm text-white/50">
        Ți-ai amintit?{" "}
        <Link href="/login" className="font-semibold text-neon-violet hover:underline">
          Intră în cont
        </Link>
      </p>
    </form>
  );
}
