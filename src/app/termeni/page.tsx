import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/legal-placeholder";

export const metadata: Metadata = { title: "Termeni și Condiții" };

export default function TermsPage() {
  return <LegalPlaceholder title="Termeni și Condiții" />;
}
