import "server-only";
import { isStaff } from "./roles";
import type { AppRole, Database } from "./supabase/database.types";
import { createClient } from "./supabase/server";

export type DirectMessage = Database["public"]["Tables"]["direct_messages"]["Row"];
export type Conversation = {
  userId: string;
  name: string;
  email: string;
  role: AppRole;
  lastMessage: string;
  lastAt: string;
  lastFromUser: boolean;
  unread: number;
};

const previewOf = (m: { content: string; attachment_type?: string | null }) =>
  m.content.trim() || (m.attachment_type === "video" ? "🎬 Video" : m.attachment_type === "image" ? "📷 Fotografie" : "");

export const THREAD_PAGE_SIZE = 100;
/** Route slug of a member's conversation with the coaching staff (shared coach inbox). */
export const COACH_THREAD = "antrenor";
/** Route slug of a member's conversation with the club administrators (feedback / „Contactează administratorul”). */
export const ADMIN_THREAD = "admin";
export type DirectoryMember = { id: string; name: string; label: string };

export async function getStaffIds() {
  const supabase = await createClient();
  const { data } = await supabase.from("users").select("id").in("role", ["admin", "superadmin"]);
  return (data ?? []).map((u) => u.id);
}

type StaffRow = { id: string; full_name: string | null; role: AppRole; shown_as_coach: boolean | null };

/** Staff split into coaches (role admin or Super Admin shown as coach) and administrators (the other Super Admins), oldest first. */
export async function getStaffGroups() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, full_name, role, shown_as_coach")
    .in("role", ["admin", "superadmin"])
    .order("created_at", { ascending: true });
  const staff = (data ?? []) as StaffRow[];
  const flagged = staff.filter((u) => u.role === "admin" || u.shown_as_coach);
  const coaches = flagged.length ? flagged : staff;
  const admins = staff.filter((u) => !coaches.includes(u));
  return { coaches, admins, coachIds: coaches.map((u) => u.id), adminIds: admins.map((u) => u.id) };
}

/** Latest messages between `meId` and any of `otherIds`, oldest first. */
export async function getPairThread(meId: string, otherIds: string[]) {
  if (!otherIds.length) return [];
  const supabase = await createClient();
  const others = otherIds.join(",");
  const { data } = await supabase
    .from("direct_messages")
    .select("*")
    .or(`and(sender_id.eq.${meId},receiver_id.in.(${others})),and(sender_id.in.(${others}),receiver_id.eq.${meId})`)
    .order("created_at", { ascending: false })
    .limit(THREAD_PAGE_SIZE);
  return (data ?? []).reverse();
}

const isCoach = (u: { role: AppRole; shown_as_coach?: boolean | null }) => u.role === "admin" || !!u.shown_as_coach;

/** Everyone a member can start a private chat with: coaches and administrators first, then the other members. */
export async function getMemberDirectory(meId: string): Promise<DirectoryMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, full_name, display_name, account_type, role, shown_as_coach")
    .neq("id", meId)
    .order("full_name", { ascending: true });
  const rank = (u: { role: AppRole; shown_as_coach?: boolean | null }) => (isStaff(u.role) ? (isCoach(u) ? 0 : 1) : 2);
  return (data ?? [])
    .sort((a, b) => rank(a) - rank(b))
    .map((u) => ({
      id: u.id,
      name: u.full_name || u.display_name || "Membru",
      label: isStaff(u.role) ? (isCoach(u) ? "Antrenor" : "Administrator") : u.account_type ?? "Membru",
    }));
}

/** Member inbox: one private conversation per person (member, coach or administrator), newest first. */
export async function getMemberInbox(meId: string): Promise<Conversation[]> {
  const supabase = await createClient();
  const [{ data: messages }] = await Promise.all([
    supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${meId},receiver_id.eq.${meId}`)
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);
  const conversations = new Map<string, Conversation>();
  for (const m of messages ?? []) {
    const other = m.sender_id === meId ? m.receiver_id : m.sender_id;
    const key = other;
    let c = conversations.get(key);
    if (!c) {
      c = {
        userId: key,
        name: "Membru",
        email: "",
        role: "user",
        lastMessage: previewOf(m),
        lastAt: m.created_at,
        lastFromUser: m.sender_id !== meId,
        unread: 0,
      };
      conversations.set(key, c);
    }
    if (m.receiver_id === meId && !m.read_at) c.unread++;
  }
  const peerIds = [...conversations.keys()];
  if (peerIds.length) {
    const { data: peers } = await supabase.from("users").select("id, full_name, display_name, role, shown_as_coach").in("id", peerIds);
    for (const p of peers ?? []) {
      const c = conversations.get(p.id);
      if (!c) continue;
      c.name = p.full_name || p.display_name || "Membru";
      c.role = isStaff(p.role) ? (isCoach(p) ? "admin" : "superadmin") : "user";
    }
  }
  return [...conversations.values()];
}

/** The coach regular users write to: the first Antrenor (role admin or a Super Admin shown as coach), falling back to any staff. */
export async function getCoach() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, full_name, role, shown_as_coach")
    .in("role", ["admin", "superadmin"])
    .order("created_at", { ascending: true });
  return data?.find((u) => u.role === "admin" || u.shown_as_coach) ?? data?.[0] ?? null;
}

export async function getUnreadCount(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("direct_messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

/** Latest messages of the conversation between `threadUserId` and the coaching staff, oldest first. */
export async function getThread(threadUserId: string, pairWith?: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("direct_messages")
    .select("*")
    .or(
      pairWith
        ? `and(sender_id.eq.${threadUserId},receiver_id.eq.${pairWith}),and(sender_id.eq.${pairWith},receiver_id.eq.${threadUserId})`
        : `sender_id.eq.${threadUserId},receiver_id.eq.${threadUserId}`,
    )
    .order("created_at", { ascending: false })
    .limit(THREAD_PAGE_SIZE);
  return (data ?? []).reverse();
}

/** Staff inbox: one entry per person who has a private conversation with me, newest first. */
export async function getInbox(meId: string): Promise<Conversation[]> {
  const supabase = await createClient();
  const [{ data: users }, { data: messages }] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase
      .from("direct_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);
  const byId = new Map((users ?? []).map((u) => [u.id, u]));
  const conversations = new Map<string, Conversation>();

  for (const m of messages ?? []) {
    const other = m.sender_id === meId ? m.receiver_id : m.receiver_id === meId ? m.sender_id : null;
    if (!other || other === meId) continue;
    let c = conversations.get(other);
    if (!c) {
      const u = byId.get(other);
      c = {
        userId: other,
        name: u?.full_name || u?.email || "Utilizator",
        email: u?.email ?? "",
        role: u?.role ?? "user",
        lastMessage: previewOf(m),
        lastAt: m.created_at,
        lastFromUser: m.sender_id === other,
        unread: 0,
      };
      conversations.set(other, c);
    }
    if (m.sender_id === other && m.receiver_id === meId && !m.read_at) c.unread++;
  }
  return [...conversations.values()];
}
