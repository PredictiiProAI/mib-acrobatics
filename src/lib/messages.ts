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

export const THREAD_PAGE_SIZE = 100;
/** Route slug of a member's conversation with the coaching staff (shared coach inbox). */
export const COACH_THREAD = "antrenor";
export type DirectoryMember = { id: string; name: string; accountType: string | null };

export async function getStaffIds() {
  const supabase = await createClient();
  const { data } = await supabase.from("users").select("id").in("role", ["admin", "superadmin"]);
  return (data ?? []).map((u) => u.id);
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

/** Members a member can start a private chat with (everyone except staff and themselves). */
export async function getMemberDirectory(meId: string): Promise<DirectoryMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, full_name, display_name, account_type")
    .in("role", ["user", "media"])
    .neq("id", meId)
    .order("full_name", { ascending: true });
  return (data ?? []).map((u) => ({ id: u.id, name: u.full_name || u.display_name || "Membru", accountType: u.account_type ?? null }));
}

/** Member inbox: the coach conversation plus every peer conversation, newest first. */
export async function getMemberInbox(meId: string): Promise<Conversation[]> {
  const supabase = await createClient();
  const [{ data: messages }, staffIds, coach] = await Promise.all([
    supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${meId},receiver_id.eq.${meId}`)
      .order("created_at", { ascending: false })
      .limit(2000),
    getStaffIds(),
    getCoach(),
  ]);
  const staff = new Set(staffIds);
  const conversations = new Map<string, Conversation>();
  for (const m of messages ?? []) {
    const other = m.sender_id === meId ? m.receiver_id : m.sender_id;
    const key = staff.has(other) ? COACH_THREAD : other;
    let c = conversations.get(key);
    if (!c) {
      c = {
        userId: key,
        name: key === COACH_THREAD ? coach?.full_name || "Antrenor" : "Membru",
        email: "",
        role: key === COACH_THREAD ? "admin" : "user",
        lastMessage: m.content,
        lastAt: m.created_at,
        lastFromUser: m.sender_id !== meId,
        unread: 0,
      };
      conversations.set(key, c);
    }
    if (m.receiver_id === meId && !m.read_at) c.unread++;
  }
  const peerIds = [...conversations.keys()].filter((k) => k !== COACH_THREAD);
  if (peerIds.length) {
    const { data: peers } = await supabase.from("users").select("id, full_name, display_name").in("id", peerIds);
    for (const p of peers ?? []) {
      const c = conversations.get(p.id);
      if (c) c.name = p.full_name || p.display_name || "Membru";
    }
  }
  return [...conversations.values()];
}

/** The coach regular users write to: the first admin, falling back to a superadmin. */
export async function getCoach() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, full_name, role")
    .in("role", ["admin", "superadmin"])
    .order("created_at", { ascending: true });
  return data?.find((u) => u.role === "admin") ?? data?.[0] ?? null;
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
export async function getThread(threadUserId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("direct_messages")
    .select("*")
    .or(`sender_id.eq.${threadUserId},receiver_id.eq.${threadUserId}`)
    .order("created_at", { ascending: false })
    .limit(THREAD_PAGE_SIZE);
  return (data ?? []).reverse();
}

/** Staff inbox: one entry per member who has a conversation with the staff, newest first. */
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
  const staff = (id: string) => isStaff(byId.get(id)?.role);
  const conversations = new Map<string, Conversation>();

  for (const m of messages ?? []) {
    const other = !staff(m.sender_id) ? m.sender_id : !staff(m.receiver_id) ? m.receiver_id : null;
    if (!other || other === meId) continue;
    let c = conversations.get(other);
    if (!c) {
      const u = byId.get(other);
      c = {
        userId: other,
        name: u?.full_name || u?.email || "Utilizator",
        email: u?.email ?? "",
        role: u?.role ?? "user",
        lastMessage: m.content,
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
