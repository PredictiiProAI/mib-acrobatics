import type { Metadata } from "next";
import { AuthForm } from "../auth-form";
import { safeNext } from "@/lib/roles";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  return (
    <>
      {error === "auth" && (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          Linkul de confirmare este invalid sau a expirat. Intră în cont cu emailul și parola și îți trimitem un cod nou.
        </p>
      )}
      <AuthForm mode="login" next={safeNext(typeof next === "string" ? next : null) ?? undefined} />
    </>
  );
}
