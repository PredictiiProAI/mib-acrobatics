"use client";

import {
  FileText,
  Clock,
  Eye,
  BellRing,
  Check,
  Plus,
  Film,
  Loader2,
  MapPin,
  Mail,
  MessageSquare,
  Search,
  Send,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/avatar";
import { ChildrenInput } from "@/components/children-input";
import { Button } from "@/components/ui";
import { useConfirm } from "@/components/confirm-dialog";
import { ROLE_BADGE_STYLE } from "@/components/role-badge";
import {
  createUser,
  deleteUser,
  getUserActivity,
  getWaiverSubmissions,
  requestDocuments,
  sendTestPush,
  setUserRole,
  updateUserProfile,
  type UserActivity,
  type WaiverRecord,
} from "@/lib/actions/users";
import { DISCIPLINE_SUGGESTIONS, LEVEL_LABEL, LEVELS } from "@/lib/profile";
import { isStaff, needsWaiver, ROLE_LABEL } from "@/lib/roles";
import { FORM_ROLE_LABEL, MEDICAL_FIELDS } from "@/lib/waiver";
import type { AppRole, Database } from "@/lib/supabase/database.types";
import { timeAgo } from "@/lib/time";

type Row =
  Database["public"]["Functions"]["admin_list_users"]["Returns"][number] & {
    posts: number;
    comments: number;
    documents_requested_at?: string | null;
    city: string | null;
    groups: string[];
  };
type Me = { id: string; role: AppRole };
/** Group names from /dashboard/schedule and cities already in use, for pickers and filters. */
type Options = { groups: string[]; cities: string[] };

type DocFilter = "all" | "declaratie" | "regulament" | "none";
const DOC_FILTERS: { value: DocFilter; label: string }[] = [
  { value: "all", label: "Toate documentele" },
  { value: "declaratie", label: "Declarație" },
  { value: "regulament", label: "Regulament" },
  { value: "none", label: "Fără documente" },
];
const NONE = "__none__";
const sameText = (a: string | null | undefined, b: string) => (a ?? "").trim().toLocaleLowerCase("ro") === b.trim().toLocaleLowerCase("ro");
function docsMatch(u: Row, f: DocFilter) {
  if (f === "all") return true;
  const parent = u.account_type === "Părinte";
  const signed = parent ? !!u.waiver_signed : !!u.rules_accepted_at;
  if (f === "declaratie") return needsWaiver(u.role) && parent && signed;
  if (f === "regulament") return needsWaiver(u.role) && !parent && signed;
  return needsWaiver(u.role) && !signed;
}

/** City input (with suggestions) + group/school checkboxes; used when creating and editing a member. */
function AssignmentFields({
  options,
  city,
  groups,
  onCity,
  onGroups,
  idPrefix,
}: {
  options: Options;
  city: string;
  groups: string[];
  onCity: (v: string) => void;
  onGroups: (v: string[]) => void;
  idPrefix: string;
}) {
  const all = [...new Set([...options.groups, ...groups])];
  const toggle = (g: string) => onGroups(groups.includes(g) ? groups.filter((x) => x !== g) : [...groups, g]);
  const [adding, setAdding] = useState<string | null>(null);
  const addNew = () => {
    const name = (adding ?? "").trim().slice(0, 80);
    setAdding(null);
    if (!name) return;
    const existing = all.find((g) => sameText(g, name));
    if (!groups.includes(existing ?? name)) onGroups([...groups, existing ?? name]);
  };
  return (
    <div className="grid gap-3">
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold text-white/60">Oraș / Localitate</span>
        <input
          list={`${idPrefix}-cities`}
          maxLength={80}
          placeholder="ex. Iași"
          value={city}
          onChange={(e) => onCity(e.target.value)}
          className={field}
          name="city"
          data-testid="assign-city"
        />
        <datalist id={`${idPrefix}-cities`}>
          {options.cities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-xs font-semibold text-white/60">Grupă / Școală</legend>
        <div className="flex flex-wrap gap-1.5" data-testid="assign-groups">
            {all.map((g) => {
              const on = groups.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggle(g)}
                  aria-pressed={on}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${on ? "bg-neon-orange text-onaccent ring-neon-orange" : "bg-white/5 text-white/70 ring-white/10 hover:text-white"}`}
                >
                  {g}
                </button>
              );
            })}
          {adding === null ? (
            <button
              type="button"
              onClick={() => setAdding("")}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-neon-green/60 px-3 py-1.5 text-xs font-semibold text-neon-green transition hover:bg-neon-green/10"
              data-testid="add-group"
            >
              <Plus className="size-3.5" /> Adaugă școală
            </button>
          ) : (
            <span className="inline-flex items-center gap-1">
              <input
                autoFocus
                value={adding}
                maxLength={80}
                placeholder="Nume școală / grupă"
                onChange={(e) => setAdding(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNew();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    setAdding(null);
                  }
                }}
                className="h-8 w-44 rounded-full border border-neon-green/60 bg-black/40 px-3 text-xs outline-none"
                data-testid="add-group-input"
              />
              <button type="button" onClick={addNew} aria-label="Adaugă" className="grid size-8 place-items-center rounded-full bg-neon-green text-black" data-testid="add-group-confirm">
                <Check className="size-4" />
              </button>
              <button type="button" onClick={() => setAdding(null)} aria-label="Renunță" className="grid size-8 place-items-center rounded-full text-white/60 hover:bg-white/5">
                <X className="size-4" />
              </button>
            </span>
          )}
        </div>
        <p className="text-[11px] text-white/40">O școală nouă apare și în filtre după salvare. Ca să primească notificări de program, adaug-o și în Program & Grupe cu același nume.</p>
      </fieldset>
    </div>
  );
}

function ProfileEditor({ user, options }: { user: Row; options: Options }) {
  const router = useRouter();
  const [form, setForm] = useState({
    phone: user.phone ?? "",
    discipline: user.discipline ?? "",
    level: user.level ?? "",
    birthdate: user.birthdate ?? "",
    children_names: user.children_names ?? "",
    emergency_contact: user.emergency_contact ?? "",
  });
  const [city, setCity] = useState(user.city ?? "");
  const [groups, setGroups] = useState<string[]>(user.groups);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const label = (text: string, value: string, required = false) => (
    <span className="flex items-center justify-between gap-2 text-xs font-semibold text-white/60">
      {text}
      {!value.trim() && <span className={`text-[11px] font-normal ${required ? "text-red-300" : "text-white/35"}`}>Necompletat</span>}
    </span>
  );
  return (
    <form
      className="rounded-2xl border border-white/10 p-4"
      data-testid="profile-editor"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setMsg(null);
          const r = await updateUserProfile(user.id, { ...form, city, groups });
          setMsg(r.ok ? { ok: true, text: "Modificările au fost salvate." } : { ok: false, text: r.error });
          if (r.ok) router.refresh();
        });
      }}
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Date profil</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          {label("Telefon", form.phone)}
          <input type="tel" value={form.phone} onChange={set("phone")} maxLength={20} placeholder="07xx xxx xxx" className={field} name="phone" />
        </label>
        <label className="grid gap-1.5">
          {label("Data nașterii", form.birthdate)}
          <input type="date" value={form.birthdate} onChange={set("birthdate")} min="1900-01-01" className={field} name="birthdate" />
        </label>
        <label className="grid gap-1.5">
          {label("Disciplină", form.discipline)}
          <input value={form.discipline} onChange={set("discipline")} list="admin-disciplines" maxLength={80} placeholder="ex. Dans" className={field} name="discipline" />
          <datalist id="admin-disciplines">
            {DISCIPLINE_SUGGESTIONS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </label>
        <label className="grid gap-1.5">
          {label("Nivel", form.level)}
          <select value={form.level} onChange={set("level")} className={field} name="level">
            <option value="">—</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </select>
        </label>
        {isParent(user) && (
          <div className="grid gap-1.5 sm:col-span-2">
            {label("Copii", form.children_names)}
            <ChildrenInput defaultValue={form.children_names} onChange={(v) => setForm((f) => ({ ...f, children_names: v }))} />
          </div>
        )}
        <label className="grid gap-1.5 sm:col-span-2">
          {label("Contact de urgență", form.emergency_contact, true)}
          <input value={form.emergency_contact} onChange={set("emergency_contact")} maxLength={200} placeholder="Nume și telefon" className={field} name="emergency_contact" />
        </label>
      </div>
      <div className="mt-4 border-t border-white/10 pt-4">
        <AssignmentFields options={options} city={city} groups={groups} onCity={setCity} onGroups={setGroups} idPrefix={`edit-${user.id}`} />
        <p className="mt-3 text-xs text-white/45">Notificările push despre un antrenament ajung doar la membrii grupei lui (și ai orașului, dacă antrenamentul are oraș).</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} data-testid="save-profile">
          {pending && <Loader2 className="size-4 animate-spin" />} Salvează modificările
        </Button>
        {msg && (
          <span className={`text-sm ${msg.ok ? "text-neon-green" : "text-red-300"}`} data-testid="save-profile-result">
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}

function AssignmentBadges({ user }: { user: Row }) {
  if (!user.city && !user.groups.length) return <p className="mt-1 text-[11px] text-white/35" data-testid="row-assignment">Fără oraș / grupă</p>;
  return (
    <div className="mt-1 flex flex-wrap gap-1" data-testid="row-assignment">
      {user.city && (
        <span className="inline-flex items-center gap-1 rounded-full bg-neon-green/10 px-2 py-0.5 text-[11px] font-semibold text-neon-green ring-1 ring-neon-green/30">
          <MapPin className="size-3" /> {user.city}
        </span>
      )}
      {user.groups.map((g) => (
        <span key={g} className="rounded-full bg-neon-orange/10 px-2 py-0.5 text-[11px] font-semibold text-neon-orange ring-1 ring-neon-orange/30">
          {g}
        </span>
      ))}
    </div>
  );
}

function TestPushButton({ target, label = "Trimite-mi un push de test" }: { target?: string; label?: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        data-testid={target ? "test-push-user" : "test-push"}
        onClick={() =>
          start(async () => {
            setMsg(null);
            const r = await sendTestPush(target);
            setMsg(r.ok ? { ok: true, text: `Trimis pe ${r.sent} ${r.sent === 1 ? "dispozitiv" : "dispozitive"}${r.summary ? ` (${r.summary})` : ""}.` } : { ok: false, text: r.error });
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />} {label}
      </Button>
      {msg && (
        <span className={`text-xs ${msg.ok ? "text-neon-green" : "text-red-300"}`} data-testid="test-push-result">
          {msg.text}
        </span>
      )}
    </div>
  );
}

const ALL_ROLES: AppRole[] = ["superadmin", "admin", "media", "user"];

/** UI-only role: Părinte is a member account (role user) with account_type "Părinte". */
type UiRole = AppRole | "parent";
const UI_ROLES: UiRole[] = ["superadmin", "admin", "media", "parent", "user"];
const uiRoleOf = (u: Row): UiRole => (u.role === "user" && u.account_type === "Părinte" ? "parent" : u.role);
const uiLabel = (r: UiRole) => (r === "parent" ? "Părinte" : ROLE_LABEL[r]);
const uiStyle = (r: UiRole) => (r === "parent" ? "bg-neon-orange/10 text-neon-orange/90 ring-neon-orange/25" : ROLE_BADGE_STYLE[r]);
const withParent = (roles: AppRole[]): UiRole[] => roles.flatMap((r): UiRole[] => (r === "user" ? ["parent", "user"] : [r]));
const toAppRole = (r: UiRole) => ({ role: r === "parent" ? ("user" as const) : r, memberType: r === "parent" ? ("Părinte" as const) : r === "user" ? ("Sportiv" as const) : undefined });
const dateFmt = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const dateTimeFmt = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const field =
  "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[15px] outline-none placeholder:text-white/30 focus:border-neon-orange/70";
const nameOf = (u: Row) => u.display_name || u.full_name || u.email;
const lastSeen = (iso: string | null) => (iso ? timeAgo(iso) : "Niciodată");
const creatableRoles = (me: Me): AppRole[] =>
  me.role === "superadmin" ? ALL_ROLES : ["user", "media"];

function Modal({
  title,
  onClose,
  children,
  side = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  side?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm ${side ? "justify-end" : "items-end justify-center p-0 sm:items-center sm:p-4"}`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={
          side
            ? "h-full w-full max-w-md animate-[slide-in_.2s_ease-out] overflow-y-auto border-l border-white/10 bg-carbon/95 p-6 backdrop-blur-xl"
            : "max-h-[92svh] w-full max-w-lg animate-[sheet-up_.2s_ease-out] overflow-y-auto rounded-t-3xl border border-neon-orange/40 bg-carbon/95 p-6 shadow-neon backdrop-blur-xl sm:rounded-3xl"
        }
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-black">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function CreateUserDialog({ me, options, onClose }: { me: Me; options: Options; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as UiRole,
  });
  const [city, setCity] = useState("");
  const [groups, setGroups] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [k]: e.target.value });
  return (
    <Modal title="Adaugă utilizator" onClose={onClose}>
      <form
        className="grid gap-3"
        data-testid="create-user-form"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            setError(null);
            const r = await createUser({ ...form, ...toAppRole(form.role), city, groups });
            if (!r.ok) return setError(r.error);
            onClose();
            router.refresh();
          });
        }}
      >
        <input
          required
          maxLength={120}
          placeholder="Nume complet"
          value={form.name}
          onChange={set("name")}
          className={field}
          name="name"
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={set("email")}
          className={field}
          name="email"
          autoComplete="off"
        />
        <input
          required
          type="text"
          minLength={8}
          placeholder="Parolă (minim 8 caractere)"
          value={form.password}
          onChange={set("password")}
          className={field}
          name="password"
          autoComplete="new-password"
        />
        <select
          value={form.role}
          onChange={set("role")}
          className={field}
          name="role"
          aria-label="Rol"
        >
          {withParent(creatableRoles(me)).map((r) => (
            <option key={r} value={r} className="bg-graphite">
              {uiLabel(r)}
            </option>
          ))}
        </select>
        <AssignmentFields options={options} city={city} groups={groups} onCity={setCity} onGroups={setGroups} idPrefix="create" />
        <p className="text-xs text-white/45">
          Contul este activ imediat (fără email de confirmare). Comunică-i
          parola utilizatorului; o poate schimba din profil.
        </p>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <Button type="submit" disabled={pending} className="mt-1">
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserPlus className="size-4" />
          )}{" "}
          Creează contul
        </Button>
      </form>
    </Modal>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-white/40">
        {label}
      </p>
      <div className="mt-0.5 break-words text-sm">{children}</div>
    </div>
  );
}

const waiverFmt = new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Bucharest" });

const isParent = (user: Row) => user.account_type === "Părinte";

function WaiverStatus({ user }: { user: Row }) {
  if (!needsWaiver(user.role))
    return <span className="text-white/50" data-testid="waiver-status">Scutit — conturile de staff nu semnează documente.</span>;
  if (!isParent(user))
    return user.rules_accepted_at ? (
      <span className="text-neon-green" data-testid="waiver-status">
        Regulament acceptat pe {waiverFmt.format(new Date(user.rules_accepted_at))}. Acordul parental îl semnează părintele din contul lui.
      </span>
    ) : (
      <span className="text-red-300" data-testid="waiver-status">Regulamentul de siguranță nu a fost acceptat încă.</span>
    );
  return user.waiver_signed ? (
    <span className="text-neon-green" data-testid="waiver-status">
      Acord parental semnat de <strong className="text-white">{user.waiver_signed_by_name}</strong>
      {user.waiver_signed_at && <> pe {waiverFmt.format(new Date(user.waiver_signed_at))}</>}
    </span>
  ) : (
    <span className="text-red-300" data-testid="waiver-status">Acord parental nesemnat — copilul nu poate participa la antrenamente.</span>
  );
}

function WaiverBadge({ user }: { user: Row }) {
  const [open, setOpen] = useState(false);
  if (!needsWaiver(user.role))
    return (
      <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-xs font-bold text-white/45 ring-1 ring-white/10" data-testid="waiver-badge" data-signed="exempt">
        Scutit
      </span>
    );
  const parent = isParent(user);
  const signed = parent ? !!user.waiver_signed : !!user.rules_accepted_at;
  const label = `${parent ? (signed ? "Declarație ✓" : "Declarație ✕") : signed ? "Regulament ✓" : "Regulament ✕"}${!signed && user.documents_requested_at ? " · cerut" : ""}`;
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${label} — vezi detalii`}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 transition ${
          signed ? "bg-neon-green/10 text-neon-green ring-neon-green/40 hover:bg-neon-green/20" : "bg-red-500/10 text-red-400 ring-red-500/40 hover:bg-red-500/20"
        }`}
        data-testid="waiver-badge"
        data-signed={signed}
        data-kind={parent ? "parent" : "rules"}
      >
        {label}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-2xl border border-white/10 bg-carbon p-3 text-xs shadow-xl" data-testid="waiver-popover">
          <WaiverStatus user={user} />
          {parent && signed && <PdfLinks userId={user.id} />}
          {!signed && <RequestDocsButton user={user} />}
        </div>
      )}
    </div>
  );
}

function RequestDocsButton({ user }: { user: Row }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState(user.documents_requested_at ?? null);
  const send = () =>
    start(async () => {
      setError(null);
      const r = await requestDocuments(user.id);
      if (!r.ok) return setError(r.error);
      setSentAt(new Date().toISOString());
      router.refresh();
    });
  return (
    <div className="mt-2 grid gap-1.5 border-t border-white/10 pt-2" data-testid="request-docs">
      <button
        type="button"
        onClick={send}
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-neon-orange px-3 py-2 text-xs font-bold text-onaccent transition hover:bg-neon-green active:scale-95 disabled:opacity-60"
        data-testid="request-docs-button"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
        {sentAt ? "Cere din nou completarea" : "Cere completarea"}
      </button>
      {sentAt && (
        <p className="text-xs text-white/50" data-testid="request-docs-sent">
          Cerut pe {waiverFmt.format(new Date(sentAt))}. Primește email și formularul îi apare la fiecare intrare în aplicație, până îl completează.
        </p>
      )}
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

function PdfLinks({ userId }: { userId: string }) {
  const [docs, setDocs] = useState<WaiverRecord[] | null>(null);
  useEffect(() => {
    let live = true;
    getWaiverSubmissions(userId).then((w) => live && setDocs(w.filter((d) => d.form_type === "parinte" && !w.some((n) => n.replaces === d.id))));
    return () => {
      live = false;
    };
  }, [userId]);
  if (!docs) return <Loader2 className="mt-2 size-4 animate-spin text-white/40" />;
  return (
    <div className="mt-2 grid gap-1.5 border-t border-white/10 pt-2">
      {docs.map((d) => (
        <a
          key={d.id}
          href={`/declaratie/${d.id}`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 rounded-lg bg-neon-orange/15 px-2.5 py-1.5 font-semibold text-neon-orange hover:bg-neon-orange/25"
          data-testid="waiver-pdf-link"
        >
          <FileText className="size-3.5 shrink-0" />
          <span className="truncate">PDF · {d.child_name || "Fișă medicală"}</span>
        </a>
      ))}
    </div>
  );
}

function UserPanel({ user, options, onClose }: { user: Row; options: Options; onClose: () => void }) {
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [waivers, setWaivers] = useState<WaiverRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    Promise.all([getUserActivity(user.id), needsWaiver(user.role) ? getWaiverSubmissions(user.id) : []]).then(([a, w]) => {
      if (!alive) return;
      setActivity(a);
      setWaivers(w);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [user.id, user.role]);
  return (
    <Modal title="Profil utilizator" onClose={onClose} side>
      <div className="space-y-6" data-testid="user-panel">
        <div className="flex items-center gap-4">
          <Avatar
            name={nameOf(user)}
            url={user.avatar_url}
            className="size-16"
            textClassName="text-2xl"
          />
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-bold">
              {nameOf(user)}
            </p>
            {user.display_name &&
              user.full_name &&
              user.display_name !== user.full_name && (
                <p className="truncate text-sm text-white/50">
                  {user.full_name}
                </p>
              )}
            <span
              className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${uiStyle(uiRoleOf(user))}`}
            >
              {uiLabel(uiRoleOf(user))}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <Detail label="Email">
              <a
                href={`mailto:${user.email}`}
                className="inline-flex items-center gap-1.5 hover:text-neon-orange"
              >
                <Mail className="size-3.5" /> {user.email}
              </a>
            </Detail>
          </div>
          <Detail label="Înscris">
            {dateFmt.format(new Date(user.created_at))}
          </Detail>
          <div className="col-span-2">
            <Detail label="Ultima accesare">
              {user.last_sign_in_at
                ? `${dateTimeFmt.format(new Date(user.last_sign_in_at))} (${timeAgo(user.last_sign_in_at)})`
                : "Niciodată"}
            </Detail>
          </div>
          <Detail label="Tip cont">{user.account_type ?? "Sportiv"}</Detail>
          <div className="col-span-2">
            <Detail label={isParent(user) ? "Acord parental & fișă medicală" : needsWaiver(user.role) ? "Regulament & siguranță" : "Documente"}>
              <WaiverStatus user={user} />
              {needsWaiver(user.role) && !(isParent(user) ? user.waiver_signed : user.rules_accepted_at) && <RequestDocsButton user={user} />}
            </Detail>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 p-4">
          <TestPushButton key={user.id} target={user.id} label="Trimite push de test acestui utilizator" />
        </div>

        <ProfileEditor key={user.id} user={user} options={options} />

        {waivers.length > 0 && (
          <section data-testid="panel-waivers">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Declarații & fișe medicale</h3>
            <ul className="mt-3 space-y-3">
              {waivers.map((w) => {
                const old = waivers.some((v) => v.replaces === w.id);
                return (
                <li key={w.id} className={`rounded-2xl border p-4 text-sm ${old ? "border-white/10 opacity-60" : "border-neon-green/30 bg-neon-green/[0.04]"}`} data-testid="panel-waiver" data-current={!old}>
                  {old && <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-white/50">Versiune anterioară</p>}
                  <p className="font-bold text-neon-green">
                    {FORM_ROLE_LABEL[w.form_type]}
                    {w.child_name && <> · copil: <span className="text-white">{w.child_name}</span></>}
                    {w.child_birthdate && <span className="font-normal text-white/60"> ({dateFmt.format(new Date(w.child_birthdate))})</span>}
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    Semnată de {w.signer_name} pe {waiverFmt.format(new Date(w.signed_at))}
                  </p>
                  <Link
                    href={`/declaratie/${w.id}`}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-neon-orange px-3 py-2 text-xs font-bold text-onaccent hover:bg-neon-green"
                    data-testid="waiver-document-link"
                  >
                    <Eye className="size-3.5" /> Vezi / Printează PDF
                  </Link>
                  <dl className="mt-3 grid gap-2">
                    <div>
                      <dt className="text-[11px] uppercase tracking-wider text-white/40">Telefon urgență</dt>
                      <dd>
                        <a href={`tel:${w.emergency_phone}`} className="font-semibold text-neon-orange">
                          {w.emergency_phone}
                        </a>
                        {w.emergency_secondary && <span className="text-white/60"> · {w.emergency_secondary}</span>}
                      </dd>
                    </div>
                    {MEDICAL_FIELDS.map((f) => (
                      <div key={f.key}>
                        <dt className="text-[11px] uppercase tracking-wider text-white/40">{f.label}</dt>
                        <dd className="whitespace-pre-line break-words text-white/85">{w[f.key]}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/dashboard/posts?author=${user.id}`}
            className="rounded-2xl border border-white/10 p-3 text-center hover:border-neon-orange/50"
          >
            <p className="font-display text-2xl font-black text-neon-orange">
              {user.posts}
            </p>
            <p className="text-xs text-white/50">postări</p>
          </Link>
          <Link
            href={`/dashboard/comments?user=${user.id}`}
            className="rounded-2xl border border-white/10 p-3 text-center hover:border-neon-green/50"
          >
            <p className="font-display text-2xl font-black text-neon-green">
              {user.comments}
            </p>
            <p className="text-xs text-white/50">comentarii</p>
          </Link>
        </div>

        {loading ? (
          <Loader2 className="mx-auto size-6 animate-spin text-neon-orange" />
        ) : (
          <>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                Postări recente
              </h3>
              {activity?.posts.length ? (
                <ul
                  className="mt-3 grid grid-cols-3 gap-2"
                  data-testid="panel-posts"
                >
                  {activity.posts.map((p) => (
                    <li
                      key={p.id}
                      className="relative aspect-square overflow-hidden rounded-xl bg-graphite"
                      title={p.caption ?? ""}
                    >
                      {p.media_type === "video" ? (
                        <span className="grid size-full place-items-center text-white/50">
                          <Film className="size-6" />
                        </span>
                      ) : (
                        <Image
                          src={p.media_url}
                          alt={p.caption ?? ""}
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-white/40">Nicio postare.</p>
              )}
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                Comentarii recente
              </h3>
              {activity?.comments.length ? (
                <ul className="mt-3 space-y-2" data-testid="panel-comments">
                  {activity.comments.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-xl bg-white/[0.03] p-3 text-sm"
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {c.content}
                      </p>
                      <p className="mt-1 flex items-center gap-1 truncate text-xs text-white/40">
                        <Clock className="size-3" /> {timeAgo(c.created_at)}
                        {c.post_caption ? ` · la „${c.post_caption}”` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-white/40">Niciun comentariu.</p>
              )}
            </section>
          </>
        )}
      </div>
    </Modal>
  );
}

function DeleteUserButton({ user }: { user: Row }) {
  const router = useRouter();
  const [confirm, confirmDialog] = useConfirm();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        aria-label={`Șterge utilizatorul ${nameOf(user)}`}
        title="Șterge utilizator"
        data-testid="delete-user"
        className="grid size-8 place-items-center rounded-xl border border-white/10 text-white/60 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
        onClick={async () => {
          const ok = await confirm({
            title: `Ștergi utilizatorul ${nameOf(user)}?`,
            description:
              "Contul, postările, comentariile, aprecierile și mesajele lui vor fi șterse definitiv. Acțiunea nu poate fi anulată.",
            confirmLabel: "Șterge utilizator",
          });
          if (!ok) return;
          startTransition(async () => {
            setError(null);
            const r = await deleteUser(user.id);
            if (!r.ok) setError(r.error);
            else router.refresh();
          });
        }}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
      </button>
      {error && <span className="block text-xs text-red-300">{error}</span>}
      {confirmDialog}
    </>
  );
}

/** Mirrors public.admin_set_role so the UI only offers changes the database will accept. */
function assignableRoles(me: Me, target: Row): UiRole[] {
  if (target.id === me.id) return [];
  if (me.role === "superadmin") return UI_ROLES;
  if (me.role === "admin" && !isStaff(target.role)) return ["parent", "user", "media"];
  return [];
}

function RoleCell({ me, user }: { me: Me; user: Row }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const options = assignableRoles(me, user);
  if (!options.length)
    return (
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${uiStyle(uiRoleOf(user))}`}
      >
        {uiLabel(uiRoleOf(user))}
      </span>
    );
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label={`Rol pentru ${user.full_name ?? user.email}`}
        value={uiRoleOf(user)}
        disabled={pending}
        data-testid="role-select"
        onChange={async (e) => {
          const { role, memberType } = toAppRole(e.target.value as UiRole);
          if (role === "admin" || role === "superadmin") {
            const ok = await confirm({
              tone: "warning",
              title: `Dai rolul ${ROLE_LABEL[role]}?`,
              description: `${user.full_name ?? user.email} va avea acces complet: moderare, utilizatori și toate conversațiile.`,
              confirmLabel: `Da, fă-l ${ROLE_LABEL[role]}`,
            });
            if (!ok) return;
          }
          startTransition(async () => {
            setError(null);
            const r = await setUserRole(user.id, role, memberType);
            if (!r.ok) setError(r.error);
          });
        }}
        className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ring-1 ring-white/10 focus:ring-neon-orange/60 ${uiStyle(uiRoleOf(user))}`}
      >
        {options.map((r) => (
          <option key={r} value={r} className="bg-graphite text-white">
            {uiLabel(r)}
          </option>
        ))}
      </select>
      {pending && <Loader2 className="size-4 animate-spin text-white/50" />}
      {error && <span className="text-xs text-red-300">{error}</span>}
      {confirmDialog}
    </div>
  );
}

export function UsersTable({ me, users, options }: { me: Me; users: Row[]; options: Options }) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = users.find((u) => u.id === openId) ?? null;
  const [filter, setFilter] = useState<UiRole | "all">("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [docFilter, setDocFilter] = useState<DocFilter>("all");
  const q = query.trim().toLowerCase();
  const rows = users.filter(
    (u) =>
      (filter === "all" || uiRoleOf(u) === filter) &&
      (cityFilter === "all" || (cityFilter === NONE ? !u.city : sameText(u.city, cityFilter))) &&
      (groupFilter === "all" || (groupFilter === NONE ? !u.groups.length : u.groups.some((g) => sameText(g, groupFilter)))) &&
      docsMatch(u, docFilter) &&
      (!q ||
        u.email.toLowerCase().includes(q) ||
        nameOf(u).toLowerCase().includes(q) ||
        (u.phone ?? "").includes(q)),
  );
  const counts = UI_ROLES.reduce<Record<string, number>>(
    (acc, r) => ({ ...acc, [r]: users.filter((u) => uiRoleOf(u) === r).length }),
    {},
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setCreating(true)} data-testid="create-user">
          <UserPlus className="size-4" /> Adaugă utilizator
        </Button>
        <TestPushButton />
        <label className="flex min-w-60 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm focus-within:border-neon-orange/70">
          <Search className="size-4 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută după nume sau email…"
            className="w-full bg-transparent outline-none placeholder:text-white/30"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...UI_ROLES] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFilter(r)}
              data-testid={`filter-${r}`}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === r ? "bg-neon-orange text-onaccent" : "bg-white/5 text-white/60 hover:text-onaccent"}`}
            >
              {r === "all"
                ? `Toți (${users.length})`
                : `${r === "parent" ? "Părinți" : ROLE_LABEL[r]} (${counts[r]})`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3" data-testid="user-filters">
        <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} aria-label="Oraș / Localitate" className={field} data-testid="filter-city">
          <option value="all">Toate orașele</option>
          <option value={NONE}>Fără oraș</option>
          {options.cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} aria-label="Grupă / Școală" className={field} data-testid="filter-group">
          <option value="all">Toate grupele</option>
          <option value={NONE}>Fără grupă</option>
          {options.groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select value={docFilter} onChange={(e) => setDocFilter(e.target.value as DocFilter)} aria-label="Documente" className={field} data-testid="filter-docs">
          {DOC_FILTERS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-white/5 text-xs uppercase tracking-wider text-white/40">
            <tr>
              <th className="px-4 py-3 font-medium">Utilizator</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Activitate</th>
              <th className="px-4 py-3 font-medium">Documente</th>
              <th className="px-4 py-3 font-medium">Ultima accesare</th>
              <th className="px-4 py-3 font-medium">Înscris</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5" data-testid="users-table">
            {rows.map((u) => (
              <tr
                key={u.id}
                className="cursor-pointer transition hover:bg-white/[0.03]"
                data-testid="user-row"
                onClick={(e) =>
                  !(e.target as HTMLElement).closest("a, button, select") &&
                  setOpenId(u.id)
                }
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={nameOf(u)}
                      url={u.avatar_url}
                      className="size-9"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {u.display_name || u.full_name || "—"}{" "}
                        {u.id === me.id && (
                          <span className="text-xs font-normal text-white/40">
                            (tu)
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-white/50">
                        {u.email}
                      </p>
                      <AssignmentBadges user={u} />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <RoleCell me={me} user={u} />
                </td>
                <td className="px-4 py-3 text-xs text-white/60">
                  <Link
                    href={`/dashboard/posts?author=${u.id}`}
                    className="hover:text-neon-orange hover:underline"
                    data-testid="posts-link"
                  >
                    {u.posts} postări
                  </Link>
                  {" · "}
                  <Link
                    href={`/dashboard/comments?user=${u.id}`}
                    className="hover:text-neon-green hover:underline"
                    data-testid="comments-link"
                  >
                    {u.comments} comentarii
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <WaiverBadge user={u} />
                </td>
                <td
                  className="px-4 py-3 text-xs text-white/60"
                  title={
                    u.last_sign_in_at
                      ? dateTimeFmt.format(new Date(u.last_sign_in_at))
                      : undefined
                  }
                  data-testid="last-login"
                >
                  {lastSeen(u.last_sign_in_at)}
                </td>
                <td className="px-4 py-3 text-xs text-white/60">
                  {dateFmt.format(new Date(u.created_at))}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenId(u.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 hover:border-neon-orange/50 hover:text-neon-orange"
                      data-testid="view-user"
                    >
                      <Eye className="size-3.5" /> Vezi profil
                    </button>
                    {!isStaff(u.role) && u.id !== me.id && (
                      <Link
                        href={`/dashboard/messages/${u.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 hover:border-neon-orange/50 hover:shadow-neon hover:text-neon-orange"
                      >
                        <MessageSquare className="size-3.5" /> Mesaj
                      </Link>
                    )}
                    {me.role === "superadmin" && u.id !== me.id && (
                      <DeleteUserButton user={u} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-white/50"
                >
                  Niciun utilizator găsit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {creating && (
        <CreateUserDialog me={me} options={options} onClose={() => setCreating(false)} />
      )}
      {opened && <UserPanel user={opened} options={options} onClose={() => setOpenId(null)} />}
    </div>
  );
}
