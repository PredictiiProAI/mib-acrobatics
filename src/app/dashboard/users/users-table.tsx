"use client";

import {
  Clock,
  Eye,
  Film,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Search,
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
import { Button } from "@/components/ui";
import { useConfirm } from "@/components/confirm-dialog";
import { ROLE_BADGE_STYLE } from "@/components/role-badge";
import {
  createUser,
  deleteUser,
  getUserActivity,
  setUserRole,
  type UserActivity,
} from "@/lib/actions/users";
import { LEVEL_LABEL } from "@/lib/profile";
import { isStaff, ROLE_LABEL } from "@/lib/roles";
import type { AppRole, Database } from "@/lib/supabase/database.types";
import { timeAgo } from "@/lib/time";

type Row =
  Database["public"]["Functions"]["admin_list_users"]["Returns"][number] & {
    posts: number;
    comments: number;
  };
type Me = { id: string; role: AppRole };

const ALL_ROLES: AppRole[] = ["superadmin", "admin", "media", "user"];
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

function CreateUserDialog({ me, onClose }: { me: Me; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as AppRole,
  });
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
            const r = await createUser(form);
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
          {creatableRoles(me).map((r) => (
            <option key={r} value={r} className="bg-graphite">
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
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

function UserPanel({ user, onClose }: { user: Row; onClose: () => void }) {
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    getUserActivity(user.id).then((a) => {
      if (!alive) return;
      setActivity(a);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [user.id]);
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
              className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_BADGE_STYLE[user.role]}`}
            >
              {ROLE_LABEL[user.role]}
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
          <Detail label="Telefon">
            {user.phone ? (
              <a
                href={`tel:${user.phone}`}
                className="inline-flex items-center gap-1.5 hover:text-neon-orange"
              >
                <Phone className="size-3.5" /> {user.phone}
              </a>
            ) : (
              <span className="text-white/40">—</span>
            )}
          </Detail>
          <Detail label="Disciplină">
            {user.discipline || <span className="text-white/40">—</span>}
          </Detail>
          <Detail label="Nivel">
            {user.level ? (
              LEVEL_LABEL[user.level]
            ) : (
              <span className="text-white/40">—</span>
            )}
          </Detail>
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
        </div>

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
function assignableRoles(me: Me, target: Row): AppRole[] {
  if (target.id === me.id) return [];
  if (me.role === "superadmin") return ALL_ROLES;
  if (me.role === "admin" && !isStaff(target.role)) return ["user", "media"];
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
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_BADGE_STYLE[user.role]}`}
      >
        {ROLE_LABEL[user.role]}
      </span>
    );
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label={`Rol pentru ${user.full_name ?? user.email}`}
        value={user.role}
        disabled={pending}
        onChange={async (e) => {
          const role = e.target.value as AppRole;
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
            const r = await setUserRole(user.id, role);
            if (!r.ok) setError(r.error);
          });
        }}
        className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ring-1 ring-white/10 focus:ring-neon-orange/60 ${ROLE_BADGE_STYLE[user.role]}`}
      >
        {options.map((r) => (
          <option key={r} value={r} className="bg-graphite text-white">
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
      {pending && <Loader2 className="size-4 animate-spin text-white/50" />}
      {error && <span className="text-xs text-red-300">{error}</span>}
      {confirmDialog}
    </div>
  );
}

export function UsersTable({ me, users }: { me: Me; users: Row[] }) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = users.find((u) => u.id === openId) ?? null;
  const [filter, setFilter] = useState<AppRole | "all">("all");
  const q = query.trim().toLowerCase();
  const rows = users.filter(
    (u) =>
      (filter === "all" || u.role === filter) &&
      (!q ||
        u.email.toLowerCase().includes(q) ||
        nameOf(u).toLowerCase().includes(q) ||
        (u.phone ?? "").includes(q)),
  );
  const counts = ALL_ROLES.reduce<Record<string, number>>(
    (acc, r) => ({ ...acc, [r]: users.filter((u) => u.role === r).length }),
    {},
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setCreating(true)} data-testid="create-user">
          <UserPlus className="size-4" /> Adaugă utilizator
        </Button>
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
          {(["all", ...ALL_ROLES] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFilter(r)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === r ? "bg-neon-orange text-black" : "bg-white/5 text-white/60 hover:text-black"}`}
            >
              {r === "all"
                ? `Toți (${users.length})`
                : `${ROLE_LABEL[r]} (${counts[r]})`}
            </button>
          ))}
        </div>
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-white/5 text-xs uppercase tracking-wider text-white/40">
            <tr>
              <th className="px-4 py-3 font-medium">Utilizator</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Activitate</th>
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
                  colSpan={6}
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
        <CreateUserDialog me={me} onClose={() => setCreating(false)} />
      )}
      {opened && <UserPanel user={opened} onClose={() => setOpenId(null)} />}
    </div>
  );
}
