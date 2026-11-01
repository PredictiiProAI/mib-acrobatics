"use client";

import { Camera, Check, KeyRound, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Button, Input } from "@/components/ui";
import { ACCOUNT_TYPES, AVATAR_MAX_BYTES, AVATAR_TYPES, DISCIPLINE_SUGGESTIONS, LEVEL_LABEL, LEVELS } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import { changePassword, saveProfile, setAvatar, setNotification, type FormState } from "./actions";

function Status({ state }: { state: FormState }) {
  if (!state) return null;
  return state.error ? (
    <p role="alert" className="text-sm font-medium text-red-400">{state.error}</p>
  ) : (
    <p role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-neon-green">
      <Check className="size-4" />
      {state.message}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-white/60">{label}</span>
      {children}
    </label>
  );
}

export function AvatarUploader({ userId, name, url }: { userId: string; name: string; url: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    if (!AVATAR_TYPES.includes(file.type)) return setError("Alege o imagine JPG, PNG, WebP sau GIF.");
    if (file.size > AVATAR_MAX_BYTES) return setError("Imaginea poate avea cel mult 5 MB.");
    setBusy(true);
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const storage = createClient().storage.from("avatars");
    const { error: uploadError } = await storage.upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    if (uploadError) {
      setBusy(false);
      return setError("Încărcarea a eșuat. Încearcă din nou.");
    }
    const publicUrl = storage.getPublicUrl(path).data.publicUrl;
    const res = await setAvatar(publicUrl);
    setBusy(false);
    if (res.error) return setError(res.error);
    setPreview(publicUrl);
    router.refresh();
  };

  const remove = async () => {
    setBusy(true);
    const res = await setAvatar(null);
    setBusy(false);
    if (res.error) return setError(res.error);
    setPreview(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar name={name} url={preview} className="size-32" textClassName="text-4xl" />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          aria-label="Schimbă poza de profil"
          className="absolute bottom-1 right-1 grid size-10 place-items-center rounded-full border-2 border-black bg-neon-orange text-black transition hover:brightness-110 disabled:opacity-60"
          data-testid="avatar-edit"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        </button>
        <input
          ref={input}
          type="file"
          accept={AVATAR_TYPES.join(",")}
          className="hidden"
          data-testid="avatar-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) upload(file);
          }}
        />
      </div>
      {preview && (
        <button type="button" onClick={remove} disabled={busy} className="inline-flex items-center gap-1 text-xs font-semibold text-white/60 transition hover:text-white">
          <Trash2 className="size-3.5" />
          Șterge poza
        </button>
      )}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

type ProfileValues = {
  full_name: string;
  display_name: string;
  discipline: string;
  level: string;
  phone: string;
  account_type: string;
  children_names: string;
  emergency_contact: string;
  birthdate: string;
  social_link: string;
};

const chip = (on: boolean) =>
  `rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
    on ? "border-neon-green bg-neon-green/10 text-neon-green" : "border-white/10 text-white/70 hover:border-neon-orange/60 hover:text-white"
  }`;

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const [state, action, pending] = useActionState(saveProfile, undefined);
  const [level, setLevel] = useState(initial.level);
  const [accountType, setAccountType] = useState(initial.account_type || "Sportiv");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="mt-5 space-y-4" data-testid="profile-form">
      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/60">Tip cont</legend>
        <input type="hidden" name="account_type" value={accountType} />
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tip cont" data-testid="account-type">
          {ACCOUNT_TYPES.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={accountType === t} onClick={() => setAccountType(t)} className={chip(accountType === t)}>
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ${accountType === "Părinte" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="min-h-0 overflow-hidden px-px pb-px">
          {accountType === "Părinte" && (
            <Field label="Numele și vârsta copilului / copiilor">
              <Input
                name="children_names"
                defaultValue={initial.children_names}
                maxLength={300}
                required
                placeholder="ex. Andrei, 9 ani; Maria, 12 ani"
                data-testid="children-names"
              />
            </Field>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nume complet">
          <Input name="full_name" defaultValue={initial.full_name} maxLength={120} required autoComplete="name" />
        </Field>
        <Field label="Nume de afișare">
          <Input name="display_name" defaultValue={initial.display_name} maxLength={60} placeholder="Cum te văd ceilalți" autoComplete="nickname" />
        </Field>
        <Field label="Disciplină / Școală parteneră">
          <Input name="discipline" defaultValue={initial.discipline} maxLength={80} list="disciplines" placeholder="ex. Dans, Gimnastică, Parkour" />
          <datalist id="disciplines">
            {DISCIPLINE_SUGGESTIONS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </Field>
        <Field label="Număr de telefon">
          <Input name="phone" type="tel" defaultValue={initial.phone} maxLength={20} placeholder="07xx xxx xxx" autoComplete="tel" />
        </Field>
        <Field label="Data nașterii">
          <Input name="birthdate" type="date" defaultValue={initial.birthdate} min="1900-01-01" max={today} className="[color-scheme:dark]" data-testid="birthdate" />
        </Field>
        <Field label="Contact de urgență (Nume & Telefon)">
          <Input name="emergency_contact" defaultValue={initial.emergency_contact} maxLength={200} placeholder="ex. Ioana Popescu — 07xx xxx xxx" data-testid="emergency-contact" />
        </Field>
        <Field label="Instagram / TikTok (Opțional)">
          <Input name="social_link" defaultValue={initial.social_link} maxLength={200} placeholder="@numele_tau sau link" autoCapitalize="none" data-testid="social-link" />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/60">Nivel de pregătire</legend>
        <input type="hidden" name="level" value={level} />
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={level === l}
              onClick={() => setLevel(level === l ? "" : l)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                level === l ? "border-neon-green bg-neon-green/10 text-neon-green" : "border-white/10 text-white/70 hover:border-neon-orange/60 hover:text-white"
              }`}
            >
              {LEVEL_LABEL[l]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Salvează modificările
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}

function Toggle({ label, initial, setting }: { label: string; initial: boolean; setting: "notify_feed" | "notify_schedule" }) {
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-white">
        {label}
        {error && <span role="alert" className="mt-1 block text-xs text-red-400">{error}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={pending}
        data-testid={setting}
        onClick={() => {
          const next = !on;
          setOn(next);
          setError(null);
          start(async () => {
            const res = await setNotification(setting, next);
            if (res.error) {
              setOn(!next);
              setError(res.error);
            }
          });
        }}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-neon-green shadow-[0_0_12px_rgb(57_255_20/0.35)]" : "bg-white/15"}`}
      >
        <span className={`absolute top-1 size-5 rounded-full transition-all ${on ? "left-6 bg-black" : "left-1 bg-white"}`} />
      </button>
    </li>
  );
}

export function NotificationToggles({ feed, schedule }: { feed: boolean; schedule: boolean }) {
  return (
    <ul className="mt-3 divide-y divide-white/10">
      <Toggle setting="notify_feed" initial={feed} label="Notificări email pentru analize & postări noi în AcroMib" />
      <Toggle setting="notify_schedule" initial={schedule} label="Notificări email pentru modificări de orar & grupe" />
    </ul>
  );
}

export function PasswordForm() {
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const res = await changePassword(prev, fd);
    if (res?.ok) form.current?.reset();
    return res;
  }, undefined);

  return (
    <form ref={form} action={action} className="mt-5 space-y-4" data-testid="password-form">
      <Field label="Parola curentă">
        <Input name="current_password" type="password" required autoComplete="current-password" />
      </Field>
      <Field label="Parola nouă">
        <Input name="new_password" type="password" required minLength={8} autoComplete="new-password" placeholder="Minim 8 caractere" />
      </Field>
      <Field label="Confirmă parola nouă">
        <Input name="confirm_password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="ghost" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          Schimbă parola
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}
