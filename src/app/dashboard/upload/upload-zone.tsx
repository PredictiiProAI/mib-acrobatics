"use client";

import { CheckCircle2, CloudUpload, Film, ImageIcon, Loader2, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { createPost } from "@/lib/actions/posts";
import { ACCEPT_ATTR, extensionFor, formatBytes, MAX_UPLOAD_BYTES, mediaTypeFor } from "@/lib/media";
import type { MediaType } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

type Status = "ready" | "uploading" | "saving" | "done" | "error";
type Item = {
  id: string;
  file: File;
  type: MediaType;
  preview: string;
  caption: string;
  status: Status;
  progress: number;
  error?: string;
};

/** Upload straight to Storage (RLS: own folder, publisher roles) with progress reporting. */
function uploadWithProgress(path: string, file: File, token: string, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${MEDIA_BUCKET}/${encoded}`);
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", SUPABASE_KEY);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.setRequestHeader("content-type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = `Eroare ${xhr.status}`;
      try {
        message = JSON.parse(xhr.responseText).message ?? message;
      } catch {}
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Conexiune întreruptă."));
    xhr.send(file);
  });
}

export function UploadZone({ userId }: { userId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.preview)), []);

  const update = (id: string, patch: Partial<Item>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const addFiles = useCallback((files: FileList | File[]) => {
    const accepted: Item[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      const type = mediaTypeFor(file.type);
      if (!type) errors.push(`${file.name}: format neacceptat`);
      else if (file.size > MAX_UPLOAD_BYTES) errors.push(`${file.name}: depășește ${formatBytes(MAX_UPLOAD_BYTES)}`);
      else
        accepted.push({ id: crypto.randomUUID(), file, type, preview: URL.createObjectURL(file), caption: "", status: "ready", progress: 0 });
    }
    setRejected(errors);
    setItems((list) => [...list.filter((i) => i.status !== "done"), ...accepted]);
  }, []);

  const remove = (id: string) =>
    setItems((list) => {
      const item = list.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return list.filter((i) => i.id !== id);
    });

  async function publishAll() {
    const pending = items.filter((i) => i.status === "ready" || i.status === "error");
    if (!pending.length) return;
    setBusy(true);
    const { data } = await createClient().auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setRejected(["Sesiunea a expirat. Autentifică-te din nou."]);
      setBusy(false);
      return;
    }
    for (const item of pending) {
      const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extensionFor(item.file.type)}`;
      update(item.id, { status: "uploading", progress: 0, error: undefined });
      try {
        await uploadWithProgress(path, item.file, token, (progress) => update(item.id, { progress }));
        update(item.id, { status: "saving", progress: 1 });
        const result = await createPost({ storagePath: path, mime: item.file.type, caption: item.caption, isPublic });
        if (!result.ok) throw new Error(result.error);
        update(item.id, { status: "done" });
      } catch (e) {
        update(item.id, { status: "error", error: e instanceof Error ? e.message : "Eroare necunoscută." });
      }
    }
    setBusy(false);
  }

  const pendingCount = items.filter((i) => i.status === "ready" || i.status === "error").length;
  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <div className="space-y-6">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`glass group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed p-10 text-center transition sm:p-14 ${
          dragging ? "border-neon-purple bg-neon-purple/5" : "border-white/15 hover:border-neon-violet/60 hover:shadow-neon"
        }`}
      >
        <span
          className={`flex size-16 items-center justify-center rounded-2xl transition ${
            dragging ? "bg-neon-purple/15 text-neon-purple" : "bg-neon-violet/10 text-neon-violet group-hover:scale-110"
          }`}
        >
          <CloudUpload className="size-8" />
        </span>
        <div>
          <p className="font-display text-xl font-bold">{dragging ? "Eliberează pentru a adăuga" : "Trage fișierele aici"}</p>
          <p className="mt-1 text-sm text-white/50">sau apasă pentru a alege din dispozitiv</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          hidden
          data-testid="upload-input"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {rejected.length > 0 && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {rejected.map((r) => (
            <p key={r} className="flex items-center gap-2">
              <TriangleAlert className="size-4 shrink-0" /> {r}
            </p>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <li key={item.id} className="glass overflow-hidden rounded-2xl">
                <div className="relative aspect-[4/5] bg-black">
                  {item.type === "video" ? (
                    <video src={item.preview} muted playsInline loop autoPlay className="size-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                    <img src={item.preview} alt={item.file.name} className="size-full object-cover" />
                  )}
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs backdrop-blur">
                    {item.type === "video" ? <Film className="size-3.5" /> : <ImageIcon className="size-3.5" />}
                    {formatBytes(item.file.size)}
                  </span>
                  {(item.status === "ready" || item.status === "error") && !busy && (
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-white/80 backdrop-blur hover:text-white"
                      aria-label="Elimină"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                  {(item.status === "uploading" || item.status === "saving") && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
                      <Loader2 className="size-8 animate-spin text-neon-violet" />
                      <p className="text-sm font-semibold">
                        {item.status === "saving" ? "Se publică…" : `${Math.round(item.progress * 100)}%`}
                      </p>
                      <div className="h-1.5 w-2/3 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-neon-violet transition-[width]" style={{ width: `${item.progress * 100}%` }} />
                      </div>
                    </div>
                  )}
                  {item.status === "done" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm">
                      <CheckCircle2 className="size-10 text-neon-purple" />
                      <p className="text-sm font-semibold text-neon-purple">Publicat</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <textarea
                    value={item.caption}
                    onChange={(e) => update(item.id, { caption: e.target.value })}
                    disabled={item.status !== "ready" && item.status !== "error"}
                    maxLength={2200}
                    rows={2}
                    placeholder="Descriere (opțional)…"
                    className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-neon-violet/70 disabled:opacity-60"
                  />
                  {item.error && <p className="text-xs text-red-300">{item.error}</p>}
                </div>
              </li>
            ))}
          </ul>

          <div className="glass sticky bottom-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4">
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={busy}
                className="size-4 accent-[var(--color-neon-purple)]"
              />
              <span>
                Public <span className="text-white/50">— apare și pe pagina principală, nu doar în AcroFeed</span>
              </span>
            </label>
            <div className="flex items-center gap-3">
              {doneCount > 0 && !busy && (
                <Link href="/dashboard/posts" className="text-sm text-neon-purple hover:underline">
                  Vezi postările ({doneCount})
                </Link>
              )}
              <Button onClick={publishAll} disabled={busy || pendingCount === 0}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <CloudUpload className="size-4" />}
                {busy ? "Se încarcă…" : `Publică ${pendingCount || ""}`.trim()}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
