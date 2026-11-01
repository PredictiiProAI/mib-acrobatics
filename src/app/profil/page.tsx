import type { Metadata } from "next";
import { RoleBadge } from "@/components/role-badge";
import { publicName, requireUser } from "@/lib/auth";
import { LEVEL_LABEL } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { AvatarUploader, NotificationToggles, PasswordForm, ProfileForm } from "./profile-forms";

export const metadata: Metadata = { title: "Profilul meu" };

export default async function ProfilePage() {
  const user = await requireUser("/profil");
  const supabase = await createClient();
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from("users").select("full_name, display_name, discipline, level").eq("id", user.id).maybeSingle(),
    supabase.from("user_settings").select("phone, notify_feed, notify_schedule").eq("user_id", user.id).maybeSingle(),
  ]);
  const name = publicName(user);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-neon-lime">Cont</p>
        <h1 className="mt-1 font-display text-3xl font-black text-white">Profilul meu</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <section className="flex flex-col items-center gap-4 rounded-3xl border border-neon-violet/40 bg-carbon/80 p-6 text-center">
          <AvatarUploader userId={user.id} name={name} url={user.avatarUrl} />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-white" data-testid="profile-name">{name}</p>
            <p className="truncate text-sm text-white/60">{user.email}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <RoleBadge role={user.role} />
            {profile?.level && (
              <span className="rounded-full bg-neon-lime/10 px-2.5 py-0.5 text-xs font-bold text-neon-lime ring-1 ring-neon-lime/40">{LEVEL_LABEL[profile.level]}</span>
            )}
          </div>
          {profile?.discipline && <p className="text-sm text-white/70">{profile.discipline}</p>}
        </section>

        <section className="rounded-3xl border border-neon-violet/40 bg-carbon/80 p-6">
          <h2 className="font-display text-lg font-bold text-white">Date personale & sportive</h2>
          <ProfileForm
            initial={{
              full_name: profile?.full_name ?? user.fullName ?? "",
              display_name: profile?.display_name ?? "",
              discipline: profile?.discipline ?? "",
              level: profile?.level ?? "",
              phone: settings?.phone ?? "",
            }}
          />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-neon-violet/40 bg-carbon/80 p-6">
          <h2 className="font-display text-lg font-bold text-white">Notificări</h2>
          <NotificationToggles feed={settings?.notify_feed ?? true} schedule={settings?.notify_schedule ?? true} />
        </section>
        <section className="rounded-3xl border border-neon-violet/40 bg-carbon/80 p-6">
          <h2 className="font-display text-lg font-bold text-white">Securitate</h2>
          <p className="mt-1 text-sm text-white/60">Schimbă parola contului tău.</p>
          <PasswordForm />
        </section>
      </div>
    </div>
  );
}
