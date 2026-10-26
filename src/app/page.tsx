import { ArrowRight, Flame, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Logo } from "@/components/logo";
import { PostTile } from "@/components/post-tile";
import { ButtonLink } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { getLatestPublicPosts } from "@/lib/posts";
import { homeFor } from "@/lib/roles";

const HERO_VIDEO =
  process.env.NEXT_PUBLIC_HERO_VIDEO_URL || "/hero-placeholder.mp4";

const PILLARS = [
  { icon: Flame, title: "Disciplină", text: "Fiecare salt începe cu mii de repetări. Construim forță, control și încredere pas cu pas." },
  { icon: ShieldCheck, title: "Siguranță", text: "Progresie atentă, antrenori dedicați și tehnică corectă înaintea oricărui element nou." },
  { icon: Users, title: "Echipă", text: "Acrobatica e un sport de încredere. Ne ridicăm unii pe alții — la propriu." },
  { icon: Sparkles, title: "Spectacol", text: "Transformăm efortul în momente care taie respirația, pe scenă și în competiție." },
];

export default async function LandingPage() {
  const [user, posts] = await Promise.all([getSessionUser(), getLatestPublicPosts(4)]);

  return (
    <main className="flex-1">
      <section className="relative isolate flex min-h-[92svh] flex-col overflow-hidden">
        <video
          className="absolute inset-0 -z-20 size-full object-cover"
          src={HERO_VIDEO}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/55 to-ink" />

        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
          <Logo />
          {user ? (
            <ButtonLink href={homeFor(user.role)} variant="ghost">
              Intră în aplicație <ArrowRight className="size-4" />
            </ButtonLink>
          ) : (
            <ButtonLink href="/login" variant="ghost">
              Login
            </ButtonLink>
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
            MIB Acrobatics este locul unde curajul devine tehnică. Urmărește antrenamentele, reacționează la cele mai
            tari momente și vorbește direct cu antrenorul.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {user ? (
              <ButtonLink href={homeFor(user.role)} className="px-7 py-3.5 text-base">
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
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="font-display text-3xl font-black uppercase sm:text-4xl">
          Filosofia <span className="text-neon-orange">MIB</span>
        </h2>
        <p className="mt-3 max-w-2xl text-white/60">
          Nu antrenăm doar corpuri, ci caractere. Patru principii ne ghidează fiecare antrenament.
        </p>
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

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-black uppercase sm:text-4xl">
            Din <span className="text-neon-green">AcroFeed</span>
          </h2>
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
          <div className="glass mt-8 rounded-2xl p-10 text-center text-white/50">
            Primele postări apar în curând. Creează-ți cont ca să nu le ratezi.
          </div>
        )}
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-white/40">
        © {new Date().getFullYear()} MIB Acrobatics
      </footer>
    </main>
  );
}
