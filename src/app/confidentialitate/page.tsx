import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/legal-placeholder";

export const metadata: Metadata = { title: "Politica de Confidențialitate" };

export default function PrivacyPage() {
  return <LegalPlaceholder title="Politica de Confidențialitate" />;
}
