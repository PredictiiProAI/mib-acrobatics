"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteComment } from "@/lib/actions/posts";

export function DeleteCommentButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Șterge comentariul"
      onClick={() =>
        confirm("Ștergi acest comentariu?") &&
        startTransition(async () => {
          const r = await deleteComment(id);
          if (!r.ok) alert(r.error);
        })
      }
      className="rounded-xl p-2 text-white/40 transition hover:bg-red-500/10 hover:text-red-300"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </button>
  );
}
