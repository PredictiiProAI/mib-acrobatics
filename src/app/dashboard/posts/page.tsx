import type { Metadata } from "next";
import { MarkSeen } from "../mark-seen";
import { CloudUpload, X } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { PUBLISHER_ROLES, isStaff } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PostAdminCard } from "./post-admin-card";

export const metadata: Metadata = { title: "Postări" };

const LIMIT = 120;

export default async function PostsPage({ searchParams }: PageProps<"/dashboard/posts">) {
  const { author } = await searchParams;
  const user = await requireRole(PUBLISHER_ROLES, "/dashboard/posts");
  const staff = isStaff(user.role);
  const supabase = await createClient();
  let query = supabase.from("feed_posts").select("*").order("created_at", { ascending: false }).limit(LIMIT);
  const authorId = staff && typeof author === "string" ? author : null;
  if (!staff) query = query.eq("author_id", user.id);
  else if (authorId) query = query.eq("author_id", authorId);
  const [{ data: posts, error }, { data: filtered }] = await Promise.all([
    query,
    authorId ? supabase.from("users").select("full_name, display_name").eq("id", authorId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (error) console.error("dashboard posts", error.message);

  return (
    <div className="space-y-8">
      <MarkSeen section="posts" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-neon-green">{staff ? "Moderare" : "Conținutul tău"}</p>
          <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">{staff ? "Toate postările" : "Postările mele"}</h1>
          <p className="mt-2 text-white/60">
            {staff
              ? "Poți șterge orice postare. Vizibilitatea o schimbă doar autorul."
              : "Gestionează ce ai publicat: vizibilitate publică sau doar pentru membri, ori ștergere."}
          </p>
        </div>
        <ButtonLink href="/dashboard/upload">
          <CloudUpload className="size-4" /> Încarcă
        </ButtonLink>
      </div>

      {authorId && (
        <div className="flex flex-wrap items-center gap-3 text-sm" data-testid="posts-filter">
          <span className="text-white/60">Postări publicate de</span>
          <span className="rounded-full bg-neon-orange/15 px-3 py-1 font-semibold text-neon-orange">{filtered?.display_name || filtered?.full_name || "utilizator"}</span>
          <Link href="/dashboard/posts" className="inline-flex items-center gap-1 text-white/50 hover:text-white">
            <X className="size-4" /> Toate postările
          </Link>
        </div>
      )}

      {!posts?.length ? (
        <div className="glass rounded-3xl p-10 text-center text-white/60">
          Nu există încă postări. Începe din <span className="text-neon-orange">Upload Zone</span>.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {posts.map((post) => (
            <PostAdminCard key={post.id} post={post} isMine={post.author_id === user.id} />
          ))}
        </ul>
      )}
    </div>
  );
}
