"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import { signIn, signUp, type AuthState } from "./actions";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, undefined);
  const isLogin = mode === "login";

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-black">{isLogin ? "Bine ai revenit" : "Creează cont"}</h1>
        <p className="text-sm text-white/50">
          {isLogin ? "Intră în comunitatea MIB Acrobatics." : "Alătură-te AcroFeed și vorbește direct cu antrenorul."}
        </p>
      </div>

      {next && <input type="hidden" name="next" value={next} />}
      {!isLogin && <Input name="full_name" placeholder="Nume complet" autoComplete="name" required maxLength={120} />}
      <Input name="email" type="email" placeholder="Email" autoComplete="email" required defaultValue={state?.email} />
      <Input
        name="password"
        type="password"
        placeholder="Parolă"
        autoComplete={isLogin ? "current-password" : "new-password"}
        required
        minLength={isLogin ? undefined : 8}
      />

      {state?.error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p role="status" className="rounded-xl border border-neon-green/30 bg-neon-green/10 px-4 py-2 text-sm text-neon-green">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Se încarcă…" : isLogin ? "Login" : "Creează cont"}
      </Button>

      <p className="text-center text-sm text-white/50">
        {isLogin ? "Nu ai cont? " : "Ai deja cont? "}
        <Link
          href={{ pathname: isLogin ? "/signup" : "/login", query: next ? { next } : undefined }}
          className="font-semibold text-neon-orange hover:underline"
        >
          {isLogin ? "Creează cont" : "Login"}
        </Link>
      </p>
    </form>
  );
}
