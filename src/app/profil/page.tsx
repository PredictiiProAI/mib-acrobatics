import { BackButton } from "@/components/back-button";
import type { Metadata } from "next";
import { RoleBadge } from "@/components/role-badge";
import { publicName, requireUser } from "@/lib/auth";
import { LEVEL_LABEL } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccountCard } from "./delete-account-card";
import { WaiverCard } from "./waiver-card";
import { AvatarUploader, NotificationToggles, PasswordForm, ProfileForm } from "./profile-forms";

export const metadata: Metadata = { title: "Profilul meu" };

export default async function ProfilePage() {
  const user = await requireUser("/profil");
  const supabase = await createClient();
  const [{ data: profile }, { data: settings }, { data: details }] = await Promise.all([
    supabase.from("users").select("full_name, display_name, discipline, level").eq("id", user.id).maybeSingle(),
    supabase.from("user_settings").select("phone, notify_feed, notify_schedule").eq("user_id", user.id).maybeSingle(),
    supabase.rpc("profile_details", { p_user: user.id }),
  ]);
  const extra = details?.[0];
  const name = publicName(user);

  return (
    <div className="space-y-6">
      <BackButton fallback="/feed" className="lg:hidden" />
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-neon-green">Cont</p>
        <h1 className="mt-1 font-display text-3xl font-black text-white">Profilul meu</h1>
      </header>

      <WaiverCard
        signed={extra?.waiver_signed ?? false}
        signedAt={extra?.waiver_signed_at ?? null}
        signedBy={extra?.waiver_signed_by_name ?? null}
        defaultName={profile?.full_name ?? user.fullName ?? ""}
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <section className="flex flex-col items-center gap-4 rounded-3xl border border-neon-orange/40 bg-carbon/80 p-6 text-center">
          <AvatarUploader userId={user.id} name={name} url={user.avatarUrl} />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-white" data-testid="profile-name">{name}</p>
            <p className="truncate text-sm text-white/60">{user.email}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <RoleBadge role={user.role} />
            {profile?.level && (
              <span className="rounded-full bg-neon-green/10 px-2.5 py-0.5 text-xs font-bold text-neon-green ring-1 ring-neon-green/40">{LEVEL_LABEL[profile.level]}</span>
            )}
          </div>
          {profile?.discipline && <p className="text-sm text-white/70">{profile.discipline}</p>}
        </section>

        <section className="rounded-3xl border border-neon-orange/40 bg-carbon/80 p-6">
          <h2 className="font-display text-lg font-bold text-white">Date personale & sportive</h2>
          <ProfileForm
            initial={{
              full_name: profile?.full_name ?? user.fullName ?? "",
              display_name: profile?.display_name ?? "",
              discipline: profile?.discipline ?? "",
              level: profile?.level ?? "",
              phone: settings?.phone ?? "",
              account_type: extra?.account_type ?? "Sportiv",
              children_names: extra?.children_names ?? "",
              emergency_contact: extra?.emergency_contact ?? "",
              birthdate: extra?.birthdate ?? "",
              social_link: extra?.social_link ?? "",
            }}
          />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-neon-orange/40 bg-carbon/80 p-6">
          <h2 className="font-display text-lg font-bold text-white">Notificări</h2>
          <NotificationToggles feed={settings?.notify_feed ?? true} schedule={settings?.notify_schedule ?? true} />
        </section>
        <section className="rounded-3xl border border-neon-orange/40 bg-carbon/80 p-6">
          <h2 className="font-display text-lg font-bold text-white">Securitate</h2>
          <p className="mt-1 text-sm text-white/60">Schimbă parola contului tău.</p>
          <PasswordForm />
        </section>
      </div>

      <DeleteAccountCard />
    </div>
  );
}
