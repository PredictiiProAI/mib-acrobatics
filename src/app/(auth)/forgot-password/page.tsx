import type { Metadata } from "next";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Am uitat parola" };

export default function ForgotPasswordPage() {
  return <ResetForm />;
}
