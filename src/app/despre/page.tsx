import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  CalendarDays,
  HeartHandshake,
  MessageSquare,
  MonitorOff,
  ShieldCheck,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { ButtonLink } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { PARTNER_SCHOOLS, WHATSAPP_NUMBER } from "@/lib/club";
import { isStaff } from "@/lib/roles";
import { PillarCards } from "./pillar-cards";

export const metadata: Metadata = {
  title: "Despre Noi",
  description:
    "MIB Acrobatics: gimnastică, acrobatică sportivă și dans & ritm pentru o creștere armonioasă, fizică și mentală, a copiilor.",
};

const WHY_PARENTS = [
  {
    icon: BadgeCheck,
    title: "Antrenori certificați",
    text: "Specialiști cu experiență, care pun tehnica și siguranța înaintea oricărui element nou.",
  },
  {
    icon: ShieldCheck,
    title: "Saltele și echipament profesionist",
    text: "Suprafețe de aterizare, saltele și aparatură omologată, verificate constant.",
  },
  {
    icon: MonitorOff,
    title: "Socializare activă, fără ecrane",
    text: "Copiii leagă prietenii reale prin mișcare, joc și lucru în echipă.",
  },
  {
    icon: HeartHandshake,
    title: "Încredere în sine",
    text: "Fiecare element reușit devine o victorie personală care se vede și în afara sălii.",
  },
];

const DEMO_TEXT =
  "Bună ziua! Aș dori să înscriu copilul la o ședință demonstrativă MIB Acrobatics.";

export default async function AboutPage() {
  const user = await getSessionUser();
  const chatHref = !user
    ? "/signup?next=/messages"
    : isStaff(user.role)
      ? "/dashboard/messages"
      : `/messages?draft=${encodeURIComponent(DEMO_TEXT)}`;
  const whatsapp = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEMO_TEXT)}`
    : null;

  return (
    <>
      {user && <AppHeader user={user} />}
      <main className={`flex-1 ${user ? "pb-20 lg:pb-0" : ""}`}>
        <section className="relative isolate overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50rem_30rem_at_70%_0%,rgb(168_85_247/0.28),transparent_65%),radial-gradient(40rem_25rem_at_0%_100%,rgb(139_92_246/0.18),transparent_60%)]" />
          {!user && <SiteHeader current="/despre" />}
          <div className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:pt-20">
            <p className="inline-flex items-center gap-2 rounded-full border border-neon-violet/40 bg-neon-violet/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-neon-violet">
              <Brain className="size-3.5" /> Despre Noi
            </p>
            <h1 className="mt-5 max-w-4xl font-display text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              Creștere armonioasă,{" "}
              <span className="text-gradient">fizică și mentală.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-white/70">
              La MIB, copiii își descoperă corpul în mișcare: postură corectă,
              forță, coordonare și curaj, într-un mediu sigur, cu antrenori
              dedicați. Suntem un laborator tehnic deschis pentru elevii din{" "}
              {PARTNER_SCHOOLS} școli partenere.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="#demo" className="px-7 py-3.5 text-base">
                Înscrie copilul <ArrowRight className="size-5" />
              </ButtonLink>
              <ButtonLink
                href="/#program"
                variant="ghost"
                className="px-7 py-3.5 text-base"
              >
                <CalendarDays className="size-5" /> Vezi programul
              </ButtonLink>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon-purple">
            Pilonii noștri
          </p>
          <h2 className="mt-3 font-display text-3xl font-black uppercase sm:text-4xl">
            Trei discipline,{" "}
            <span className="text-neon-violet">un copil complet</span>
          </h2>
          <p className="mt-3 max-w-2xl text-white/60">
            Alege un pilon ca să vezi ce câștigă copilul tău.
          </p>
          <div className="mt-10">
            <PillarCards />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon-purple">
            Pentru părinți
          </p>
          <h2 className="mt-3 font-display text-3xl font-black uppercase sm:text-4xl">
            De ce ne aleg <span className="text-neon-violet">părinții</span>
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_PARENTS.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="glass rounded-2xl p-6 transition hover:-translate-y-1 hover:border-neon-violet/40 hover:shadow-neon"
                data-testid="why-parents"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-neon-violet/10 text-neon-violet ring-1 ring-neon-violet/25">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-5 font-display text-lg font-extrabold">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-white/60">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="demo"
          className="mx-auto max-w-6xl scroll-mt-8 px-5 pb-24 pt-8"
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-neon-violet/40 bg-gradient-to-br from-neon-violet/25 via-carbon to-neon-purple/15 p-8 shadow-[0_0_80px_-30px_rgb(168_85_247/0.8)] sm:p-12">
            <div className="pointer-events-none absolute -right-16 -top-16 size-72 animate-pulse rounded-full bg-neon-violet/25 blur-3xl" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon-violet">
                  Ședință demonstrativă
                </p>
                <h2 className="mt-3 font-display text-3xl font-black uppercase sm:text-4xl">
                  Înscrie copilul la o{" "}
                  <span className="text-gradient">ședință demonstrativă</span>
                </h2>
                <p className="mt-3 max-w-xl text-white/70">
                  Scrie-ne și îți propunem grupa potrivită vârstei și nivelului.
                  Antrenorul îți răspunde direct, în aplicație
                  {whatsapp ? " sau pe WhatsApp" : ""}.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <ButtonLink
                  href={chatHref}
                  className="px-7 py-4 text-base"
                  data-testid="demo-chat"
                >
                  <MessageSquare className="size-5" /> Scrie antrenorului
                </ButtonLink>
                {whatsapp && (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25d366] px-7 py-4 text-base font-semibold text-black transition hover:brightness-110"
                  >
                    WhatsApp
                  </a>
                )}
                {!user && (
                  <p className="text-center text-xs text-white/50">
                    Îți faci cont gratuit în 30 de secunde, apoi ajungi direct
                    în chat.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
