import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalDocument } from "@/components/legal-document";
import { LEGAL_UPDATED, TERMS_INTRO, TERMS_SECTIONS } from "@/lib/legal";

export const metadata: Metadata = pageMetadata("/termeni", "Termeni și Condiții", "Termenii de utilizare ai platformei AcroMIB, administrată de MIB Acrobatics.");

export default function TermsPage() {
  return <LegalDocument title="Termeni și Condiții" updated={LEGAL_UPDATED} intro={TERMS_INTRO} sections={TERMS_SECTIONS} />;
}
