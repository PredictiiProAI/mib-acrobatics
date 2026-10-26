import type { Metadata } from "next";
import { AuthForm } from "../auth-form";
import { safeNext } from "@/lib/roles";

export const metadata: Metadata = { title: "Creează cont" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;
  return <AuthForm mode="signup" next={safeNext(typeof next === "string" ? next : null) ?? undefined} />;
}
