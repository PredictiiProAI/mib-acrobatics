import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  CalendarDays,
  HeartHandshake,
  MessageSquare,
  MonitorOff,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { getAboutContent } from "@/lib/about.server";
import { getSessionUser } from "@/lib/auth";
import { PARTNER_SCHOOLS, WHATSAPP_NUMBER } from "@/lib/club";
import { isStaff } from "@/lib/roles";
import { GalleryGrid } from "./gallery-grid";
import { PillarCards } from "./pillar-cards";

export const metadata: Metadata = pageMetadata("/despre", "Despre Noi", "MIB Acrobatics: gimnastică, acrobatică sportivă și dans & ritm pentru o creștere armonioasă, fizică și mentală, a copiilor.");

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
  const [user, { team, gallery }] = await Promise.all([getSessionUser(), getAboutContent()]);
  const canEdit = isStaff(user?.role);
  const chatHref = !user
    ? "/signup?next=/messages"
    : isStaff(user.role)
      ? "/dashboard/messages"
      : `/messages/antrenor?draft=${encodeURIComponent(DEMO_TEXT)}`;
  const whatsapp = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEMO_TEXT)}`
    : null;

  return (
    <>
      {user && <AppHeader user={user} />}
      <main className="flex-1 pb-20 md:pb-0">
        <section className="relative isolate overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50rem_30rem_at_70%_0%,rgb(255_106_0/0.28),transparent_65%),radial-gradient(40rem_25rem_at_0%_100%,rgb(57_255_20/0.18),transparent_60%)]" />
          {!user && <SiteHeader current="/despre" />}
          <div className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:pt-20">
            <p className="inline-flex items-center gap-2 rounded-full border border-neon-orange/40 bg-neon-orange/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-neon-orange">
              <Brain className="size-3.5" /> Despre Noi
            </p>
            <h1 className="mt-5 max-w-4xl font-display text-3xl font-black uppercase leading-[0.95] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              Creștere armonioasă,{" "}
              <span className="text-gradient">fizică și mentală.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base text-white/70 sm:text-lg">
              La MIB, copiii își descoperă corpul în mișcare: postură corectă,
              forță, coordonare și curaj, într-un mediu sigur, cu antrenori
              dedicați. Suntem un laborator tehnic deschis pentru elevii din{" "}
              {PARTNER_SCHOOLS} școli partenere.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href="#demo" className="w-full px-7 py-3.5 text-base active:scale-95 sm:w-auto">
                Înscrie copilul <ArrowRight className="size-5" />
              </ButtonLink>
              <ButtonLink
                href="/#program"
                variant="ghost"
                className="w-full px-7 py-3.5 text-base active:scale-95 sm:w-auto"
              >
                <CalendarDays className="size-5" /> Vezi programul
              </ButtonLink>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon-green">
            Pilonii noștri
          </p>
          <h2 className="mt-3 font-display text-3xl font-black uppercase sm:text-4xl">
            Trei discipline,{" "}
            <span className="text-neon-orange">un copil complet</span>
          </h2>
          <p className="mt-3 max-w-2xl text-white/60">
            Alege un pilon ca să vezi ce câștigă copilul tău.
          </p>
          <div className="mt-10">
            <PillarCards />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon-green">
            Pentru părinți
          </p>
          <h2 className="mt-3 font-display text-3xl font-black uppercase sm:text-4xl">
            De ce ne aleg <span className="text-neon-orange">părinții</span>
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_PARENTS.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="glass rounded-2xl p-6 transition hover:-translate-y-1 hover:border-neon-orange/40 hover:shadow-neon"
                data-testid="why-parents"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-neon-orange/10 text-neon-orange ring-1 ring-neon-orange/25">
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

        {(team.length > 0 || canEdit) && (
          <section className="mx-auto max-w-6xl px-5 py-16" data-testid="team-section">
            <SectionHead eyebrow="Antrenori" title="Echipa" accent="Noastră" canEdit={canEdit} />
            {team.length === 0 ? (
              <p className="mt-6 text-white/50">Niciun membru adăugat încă.</p>
            ) : (
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {team.map((m) => (
                  <article
                    key={m.id}
                    className="group overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-graphite/90 to-carbon/90 transition hover:-translate-y-1 hover:border-neon-orange/50 hover:shadow-neon"
                    data-testid="team-card"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-black">
                      {m.image_url ? (
                        <Image src={m.image_url} alt={m.name} fill sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />
                      ) : (
                        <span className="grid size-full place-items-center bg-neon-orange/10 font-display text-6xl font-black text-neon-orange">{m.name[0]?.toUpperCase()}</span>
                      )}
                      <div className="theme-dark pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
                    </div>
                    <div className="p-5">
                      <h3 className="font-display text-xl font-extrabold">{m.name}</h3>
                      <p className="mt-1 text-sm font-semibold text-neon-green">{m.role}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {(gallery.length > 0 || canEdit) && (
          <section className="mx-auto max-w-6xl px-5 py-16" data-testid="gallery-section">
            <SectionHead eyebrow="Sala noastră" title="Galerie" accent="Foto" canEdit={canEdit} />
            <div className="mt-10">{gallery.length === 0 ? <p className="text-white/50">Nicio fotografie încă.</p> : <GalleryGrid images={gallery} />}</div>
          </section>
        )}

        <section
          id="demo"
          className="mx-auto max-w-6xl scroll-mt-8 px-5 pb-24 pt-8"
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-neon-orange/40 bg-gradient-to-br from-neon-orange/25 via-carbon to-neon-green/15 p-8 shadow-[0_0_80px_-30px_rgb(255_106_0/0.8)] sm:p-12">
            <div className="pointer-events-none absolute -right-16 -top-16 size-72 animate-pulse rounded-full bg-neon-orange/25 blur-3xl" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon-orange">
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
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-neon-green px-7 py-4 text-base font-semibold text-onaccent transition hover:brightness-110"
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

function SectionHead({ eyebrow, title, accent, canEdit }: { eyebrow: string; title: string; accent: string; canEdit: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon-green">{eyebrow}</p>
        <h2 className="mt-3 font-display text-3xl font-black uppercase sm:text-4xl">
          {title} <span className="text-neon-orange">{accent}</span>
        </h2>
      </div>
      {canEdit && (
        <Link href="/dashboard/about" className="inline-flex items-center gap-2 rounded-xl border border-neon-orange/40 px-3 py-2 text-sm font-semibold text-neon-orange transition hover:bg-neon-orange/10">
          <Pencil className="size-4" /> Editează
        </Link>
      )}
    </div>
  );
}
