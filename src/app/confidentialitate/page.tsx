import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal-document";
import { LEGAL_UPDATED, PRIVACY_INTRO, PRIVACY_SECTIONS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Politica de Confidențialitate",
  description: "Cum prelucrează MIB Acrobatics datele personale în platforma AcroMIB, conform GDPR.",
};

export default function PrivacyPage() {
  return <LegalDocument title="Politica de Confidențialitate" updated={LEGAL_UPDATED} intro={PRIVACY_INTRO} sections={PRIVACY_SECTIONS} />;
}
