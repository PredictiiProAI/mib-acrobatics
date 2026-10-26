"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { deleteComment } from "@/lib/actions/posts";

export function DeleteCommentButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  return (
    <>
    {error && <span className="text-xs text-red-300">{error}</span>}
    <button
      type="button"
      disabled={pending}
      aria-label="Șterge comentariul"
      onClick={async () => {
        if (!(await confirm({ title: "Ștergi acest comentariu?", description: "Comentariul va fi eliminat definitiv din AcroFeed.", confirmLabel: "Șterge" }))) return;
        startTransition(async () => {
          setError(null);
          const r = await deleteComment(id);
          if (!r.ok) setError(r.error);
        });
      }}
      className="rounded-xl p-2 text-white/40 transition hover:bg-red-500/10 hover:text-red-300"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </button>
    {confirmDialog}
    </>
  );
}
