import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/time";
import { DeleteCommentButton } from "./delete-comment-button";

export const metadata: Metadata = { title: "Moderare comentarii" };

export default async function CommentsModerationPage() {
  await requireRole(STAFF_ROLES, "/dashboard/comments");
  const supabase = await createClient();
  const { data: comments, error } = await supabase
    .from("comments")
    .select("id, content, created_at, author:users!comments_user_id_fkey(full_name), post:posts!comments_post_id_fkey(caption, media_type)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) console.error("moderation comments", error.message);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-neon-purple">Moderare</p>
        <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">Comentarii recente</h1>
        <p className="mt-2 text-white/60">Ultimele 200 de comentarii din AcroFeed. Poți șterge oricare dintre ele.</p>
      </div>
      {!comments?.length ? (
        <div className="glass rounded-3xl p-10 text-center text-white/60">Niciun comentariu încă.</div>
      ) : (
        <ul className="glass divide-y divide-white/5 rounded-2xl">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold text-neon-violet">{c.author?.full_name ?? "Utilizator"}</span>
                  <span className="ml-2 text-xs text-white/40">{timeAgo(c.created_at)}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-white/85">{c.content}</p>
                <p className="mt-1 truncate text-xs text-white/40">
                  la {c.post?.media_type === "video" ? "videoclipul" : "fotografia"}
                  {c.post?.caption ? ` „${c.post.caption}”` : ""}
                </p>
              </div>
              <DeleteCommentButton id={c.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
