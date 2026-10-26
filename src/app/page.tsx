import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  Flame,
  Hand,
  MessageSquare,
  Rss,
  ShieldCheck,
  Sparkles,
  StretchHorizontal,
  Trophy,
  Users,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { Logo } from "@/components/logo";
import { PostTile } from "@/components/post-tile";
import { ButtonLink } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { DISCIPLINES, SCHEDULE, WHY_MIB, type DisciplineKey } from "@/lib/club";
import { getLatestPublicPosts } from "@/lib/posts";
import { homeFor, isStaff } from "@/lib/roles";
import logoMark from "../../public/mib-logo.png";

const HERO_VIDEO = process.env.NEXT_PUBLIC_HERO_VIDEO_URL || "/hero-placeholder.mp4";

const PILLARS = [
  { icon: Flame, title: "Disciplină", text: "Fiecare salt începe cu mii de repetări. Construim forță, control și încredere pas cu pas." },
  { icon: ShieldCheck, title: "Siguranță", text: "Progresie atentă, antrenori dedicați și tehnică corectă înaintea oricărui element nou." },
  { icon: Users, title: "Echipă", text: "Acrobatica e un sport de încredere. Ne ridicăm unii pe alții — la propriu." },
  { icon: Sparkles, title: "Spectacol", text: "Transformăm efortul în momente care taie respirația, pe scenă și în competiție." },
];

const DISCIPLINE_ICON: Record<DisciplineKey, LucideIcon> = {
  tumbling: Zap,
  trampoline: Wind,
  partner: Users,
  handstand: Hand,
  flex: StretchHorizontal,
  show: Trophy,
};

const NAV = [
  { href: "#club", label: "Clubul" },
  { href: "#discipline", label: "Discipline" },
  { href: "#program", label: "Program" },
  { href: "#acrofeed", label: "AcroFeed" },
];

function SectionTitle({ eyebrow, children, text }: { eyebrow: string; children: React.ReactNode; text?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon-green">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-black uppercase sm:text-4xl">{children}</h2>
      {text && <p className="mt-3 max-w-2xl text-white/60">{text}</p>}
    </div>
  );
}

export default async function LandingPage() {
  const [user, posts] = await Promise.all([getSessionUser(), getLatestPublicPosts(4)]);
  const home = user ? homeFor(user.role) : "/signup";
  const messages = user ? (isStaff(user.role) ? "/dashboard/messages" : "/messages") : "/signup";

  return (
    <main className="flex-1">
      <section className="relative isolate flex min-h-[92svh] flex-col overflow-hidden">
        <video className="absolute inset-0 -z-20 size-full object-cover" src={HERO_VIDEO} autoPlay muted loop playsInline preload="auto" aria-hidden />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/55 to-ink" />

        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <Logo />
          <nav className="hidden items-center gap-1 rounded-2xl border border-white/10 bg-black/30 p-1 backdrop-blur-xl md:flex" aria-label="Secțiuni">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="rounded-xl px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/5 hover:text-white">
                {n.label}
              </a>
            ))}
          </nav>
          {user ? (
            <ButtonLink href={home} variant="ghost">
              Intră în aplicație <ArrowRight className="size-4" />
            </ButtonLink>
          ) : (
            <div className="flex gap-2">
              <ButtonLink href="/login" variant="ghost">
                Login
              </ButtonLink>
              <ButtonLink href="/signup" className="hidden sm:inline-flex">
                Creează Cont
              </ButtonLink>
            </div>
          )}
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 pb-20">
          <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-neon-green/40 bg-neon-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-neon-green">
            <span className="size-1.5 animate-pulse rounded-full bg-neon-green" /> Club de acrobatică
          </p>
          <h1 className="font-display text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
            Sfidează
            <br />
            <span className="text-gradient">gravitația.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/70">
            MIB Acrobatics este locul unde curajul devine tehnică. Urmărește antrenamentele, reacționează la cele mai tari momente și vorbește direct cu
            antrenorul.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {user ? (
              <ButtonLink href="/feed" className="px-7 py-3.5 text-base">
                Deschide AcroFeed <ArrowRight className="size-5" />
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/signup" className="px-7 py-3.5 text-base">
                  Creează Cont <ArrowRight className="size-5" />
                </ButtonLink>
                <ButtonLink href="/login" variant="ghost" className="px-7 py-3.5 text-base">
                  Login
                </ButtonLink>
              </>
            )}
            <ButtonLink href="#program" variant="ghost" className="px-7 py-3.5 text-base">
              <CalendarDays className="size-5" /> Vezi programul
            </ButtonLink>
          </div>
        </div>
      </section>

      <section id="club" className="mx-auto grid max-w-6xl scroll-mt-8 items-center gap-10 px-5 py-20 lg:grid-cols-2">
        <div>
          <SectionTitle eyebrow="Despre noi">
            Clubul <span className="text-neon-orange">MIB Acrobatics</span>
          </SectionTitle>
          <p className="mt-5 text-white/70">
            Suntem un club de acrobatică pentru copii, adolescenți și adulți. Lucrăm în grupe mici, pe niveluri, astfel încât fiecare sportiv să progreseze în
            ritmul lui — de la primul rostogol până la elemente de spectacol și competiție.
          </p>
          <ul className="mt-6 space-y-3">
            {WHY_MIB.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-white/80">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-neon-green/15 text-neon-green">
                  <Check className="size-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-neon-orange/25 via-transparent to-neon-green/20 blur-2xl" />
          <div className="glass grid place-items-center rounded-[2rem] p-10 sm:p-14">
            <Image src={logoMark} alt="MIB Acrobatics" className="h-auto w-full max-w-sm drop-shadow-[0_0_30px_rgb(255_106_0/0.35)]" />
            <div className="mt-8 grid w-full grid-cols-3 gap-3 text-center">
              {[
                { icon: Activity, label: "Forță" },
                { icon: Flame, label: "Curaj" },
                { icon: Users, label: "Echipă" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <Icon className="mx-auto size-5 text-neon-orange" />
                  <p className="mt-1.5 text-xs font-semibold text-white/70">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <SectionTitle eyebrow="Valori" text="Nu antrenăm doar corpuri, ci caractere. Patru principii ne ghidează fiecare antrenament.">
          Filosofia <span className="text-neon-orange">MIB</span>
        </SectionTitle>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="glass rounded-2xl p-6 transition hover:-translate-y-1 hover:border-neon-orange/40">
              <Icon className="size-7 text-neon-green" />
              <h3 className="mt-4 font-display text-lg font-extrabold">{title}</h3>
              <p className="mt-2 text-sm text-white/60">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="discipline" className="mx-auto max-w-6xl scroll-mt-8 px-5 py-20">
        <SectionTitle eyebrow="Ce antrenăm" text="De la bazele acrobaticii la elemente de spectacol, fiecare disciplină are progresia ei.">
          Discipline
        </SectionTitle>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DISCIPLINES.map((d) => {
            const Icon = DISCIPLINE_ICON[d.key];
            return (
              <article key={d.key} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-graphite/80 to-carbon/80 p-6 transition hover:-translate-y-1 hover:border-neon-orange/40">
                <div className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-neon-orange/10 blur-2xl transition group-hover:bg-neon-orange/25" />
                <span className="grid size-12 place-items-center rounded-2xl bg-neon-orange/10 text-neon-orange ring-1 ring-neon-orange/25">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-5 font-display text-xl font-extrabold">{d.title}</h3>
                <p className="mt-2 text-sm text-white/60">{d.text}</p>
                <p className="mt-4 inline-flex rounded-full bg-neon-green/10 px-2.5 py-1 text-[11px] font-semibold text-neon-green">{d.level}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="program" className="mx-auto max-w-6xl scroll-mt-8 px-5 py-12">
        <SectionTitle eyebrow="Antrenamente" text="Grupe pe vârste și niveluri. Pentru o oră de probă sau schimbări de program, scrie-i antrenorului din aplicație.">
          Program <span className="text-neon-green">săptămânal</span>
        </SectionTitle>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SCHEDULE.map((g) => (
            <div key={g.group} className="glass rounded-2xl p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-lg font-extrabold">{g.group}</h3>
                <span className="rounded-full bg-neon-orange/15 px-2.5 py-1 text-xs font-bold text-neon-orange">{g.age}</span>
              </div>
              <ul className="mt-4 divide-y divide-white/5">
                {g.sessions.map((s) => (
                  <li key={s.day + s.time} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="inline-flex items-center gap-2 font-semibold text-white/85">
                      <CalendarDays className="size-4 text-white/40" /> {s.day}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-white/60">
                      <Clock className="size-3.5" /> {s.time}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex flex-col justify-between rounded-2xl border border-neon-orange/40 bg-gradient-to-br from-neon-orange/20 to-transparent p-6">
            <div>
              <h3 className="font-display text-lg font-extrabold">Prima oră de probă</h3>
              <p className="mt-2 text-sm text-white/70">Fă-ți cont și scrie-i antrenorului în Mesaje. Îți recomandăm grupa potrivită.</p>
            </div>
            <ButtonLink href={messages} className="mt-6 w-fit">
              <MessageSquare className="size-4" /> Scrie antrenorului
            </ButtonLink>
          </div>
        </div>
      </section>

      <section id="acrofeed" className="mx-auto max-w-6xl scroll-mt-8 px-5 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle eyebrow="Din sală" text="Cele mai noi momente publice. Membrii văd tot feed-ul, cu aprecieri și comentarii.">
            Din <span className="text-neon-green">AcroFeed</span>
          </SectionTitle>
          <ButtonLink href={user ? "/feed" : "/signup"} variant="ghost">
            Vezi tot <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
        {posts.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {posts.map((post) => (
              <PostTile key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="glass mt-8 rounded-2xl p-10 text-center text-white/50">Primele postări apar în curând. Creează-ți cont ca să nu le ratezi.</div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="relative overflow-hidden rounded-[2rem] border border-neon-orange/30 bg-gradient-to-br from-neon-orange/20 via-carbon to-neon-green/15 p-8 sm:p-12">
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-neon-orange/25 blur-3xl" />
          <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-display text-3xl font-black uppercase sm:text-4xl">
                Gata de <span className="text-gradient">primul salt?</span>
              </h2>
              <p className="mt-3 max-w-xl text-white/70">Intră în comunitatea MIB: urmărește antrenamentele în AcroFeed și vorbește direct cu antrenorul.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {user ? (
                <ButtonLink href="/feed" className="px-7 py-3.5 text-base">
                  <Rss className="size-5" /> Deschide AcroFeed
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink href="/signup" className="px-7 py-3.5 text-base">
                    Creează Cont <ArrowRight className="size-5" />
                  </ButtonLink>
                  <ButtonLink href="/login" variant="ghost" className="px-7 py-3.5 text-base">
                    Am deja cont
                  </ButtonLink>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-white/40 sm:flex-row">
          <Logo />
          <nav className="flex gap-4">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-white">
                {n.label}
              </a>
            ))}
          </nav>
          <p>© {new Date().getFullYear()} MIB Acrobatics</p>
        </div>
      </footer>
    </main>
  );
}
