"use client";

import { ArrowDown, ArrowUp, Check, ImagePlus, Loader2, Pencil, Trash2, UserPlus, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { ABOUT_MAX_BYTES, ABOUT_MIME, DEFAULT_TEAM_ROLE, type GalleryImage, type TeamMember } from "@/lib/about";
import { addGalleryImages, addTeamMember, deleteGalleryImage, deleteTeamMember, moveItem, updateTeamMember } from "@/lib/actions/about";
import { extensionFor, formatBytes } from "@/lib/media";
import { createClient } from "@/lib/supabase/client";
import { ABOUT_BUCKET } from "@/lib/supabase/env";

const card = "glass rounded-3xl p-6 sm:p-8";
const field =
  "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[15px] outline-none placeholder:text-white/30 focus:border-neon-violet/70";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-neon-violet px-5 py-3 font-bold text-white shadow-neon transition hover:brightness-110 hover:shadow-neon-lg disabled:opacity-40";
const iconBtn = "grid size-9 place-items-center rounded-xl text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-30";

function checkFile(file: File) {
  if (!ABOUT_MIME.includes(file.type)) return `${file.name}: doar JPG, PNG, WEBP sau GIF`;
  if (file.size > ABOUT_MAX_BYTES) return `${file.name}: depășește ${formatBytes(ABOUT_MAX_BYTES)}`;
  return null;
}

/** Uploads to the about_media bucket (RLS: admins only) and returns the object path. */
async function uploadImage(folder: "team" | "gallery", file: File) {
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extensionFor(file.type)}`;
  const { error } = await createClient().storage.from(ABOUT_BUCKET).upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

function MoveButtons({ table, id, first, last, busy, run }: { table: "team_members" | "gallery_images"; id: string; first: boolean; last: boolean; busy: boolean; run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void }) {
  return (
    <>
      <button type="button" className={iconBtn} disabled={first || busy} onClick={() => run(() => moveItem(table, id, -1))} aria-label="Mută mai sus">
        <ArrowUp className="size-4" />
      </button>
      <button type="button" className={iconBtn} disabled={last || busy} onClick={() => run(() => moveItem(table, id, 1))} aria-label="Mută mai jos">
        <ArrowDown className="size-4" />
      </button>
    </>
  );
}

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) =>
    startTransition(async () => {
      setError(null);
      const result = await fn();
      if (!result.ok) return setError(result.error ?? "A apărut o eroare.");
      onOk?.();
      router.refresh();
    });
  return { pending, error, setError, run };
}

export function TeamManager({ members }: { members: TeamMember[] }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState(DEFAULT_TEAM_ROLE);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; role: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  const { pending, error, setError, run } = useAction();
  const [confirm, confirmDialog] = useConfirm();
  const busy = pending || uploading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setError(null);
    let imagePath: string | null = null;
    if (file) {
      setUploading(true);
      try {
        imagePath = await uploadImage("team", file);
      } catch (err) {
        setUploading(false);
        return setError(`Fotografia nu a putut fi încărcată: ${err instanceof Error ? err.message : "eroare"}`);
      }
      setUploading(false);
    }
    run(
      () => addTeamMember({ name, role, imagePath }),
      () => {
        setName("");
        setRole(DEFAULT_TEAM_ROLE);
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
      },
    );
  }

  async function remove(m: TeamMember) {
    if (!(await confirm({ title: `Ștergi pe ${m.name}?`, description: "Membrul și fotografia lui vor fi eliminate de pe pagina Despre Noi.", confirmLabel: "Șterge" }))) return;
    run(() => deleteTeamMember(m.id));
  }

  return (
    <section className={card} data-testid="team-manager">
      <h2 className="font-display text-2xl font-black">Echipa Noastră</h2>
      <p className="mt-1 text-sm text-white/55">Antrenori colaboratori: fotografie, nume și rol.</p>

      <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr]">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative grid size-28 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-white/15 bg-black/30 text-white/50 transition hover:border-neon-violet/60 hover:text-neon-violet"
          aria-label="Alege fotografia antrenorului"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-xs">
              <ImagePlus className="size-6" /> Fotografie
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ABOUT_MIME.join(",")}
          className="hidden"
          data-testid="team-photo"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            const problem = f && checkFile(f);
            setError(problem || null);
            setFile(problem ? null : f);
          }}
        />
        <div className="grid gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Nume (ex. Andrei Popescu)" className={field} data-testid="team-name" required />
          <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={80} placeholder="Rol (ex. Antrenor Colaborator)" className={field} data-testid="team-role" />
          <button type="submit" disabled={!name.trim() || busy} className={`${primaryBtn} sm:justify-self-start`} data-testid="team-add">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <UserPlus className="size-5" />} Adaugă în echipă
          </button>
        </div>
      </form>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {members.length === 0 && <li className="text-sm text-white/45">Niciun membru adăugat încă.</li>}
        {members.map((m, i) => (
          <li key={m.id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/30 p-3" data-testid="team-item">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-graphite ring-1 ring-neon-violet/30">
              {m.image_url ? (
                <Image src={m.image_url} alt={m.name} fill sizes="64px" className="object-cover" />
              ) : (
                <span className="grid size-full place-items-center font-display text-2xl font-black text-neon-lime">{m.name[0]?.toUpperCase()}</span>
              )}
            </div>
            {editing?.id === m.id ? (
              <div className="grid min-w-0 flex-1 gap-2">
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={80} className={`${field} py-2`} aria-label="Nume" />
                <input value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} maxLength={80} className={`${field} py-2`} aria-label="Rol" />
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{m.name}</p>
                <p className="truncate text-sm text-neon-lime">{m.role}</p>
              </div>
            )}
            <div className="flex shrink-0 flex-wrap justify-end gap-0.5">
              {editing?.id === m.id ? (
                <>
                  <button type="button" className={iconBtn} disabled={pending} onClick={() => run(() => updateTeamMember(m.id, editing), () => setEditing(null))} aria-label="Salvează">
                    <Check className="size-4 text-neon-lime" />
                  </button>
                  <button type="button" className={iconBtn} onClick={() => setEditing(null)} aria-label="Renunță">
                    <X className="size-4" />
                  </button>
                </>
              ) : (
                <>
                  <MoveButtons table="team_members" id={m.id} first={i === 0} last={i === members.length - 1} busy={pending} run={run} />
                  <button type="button" className={iconBtn} onClick={() => setEditing({ id: m.id, name: m.name, role: m.role })} aria-label="Editează">
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" className={`${iconBtn} hover:!bg-red-500/10 hover:!text-red-300`} disabled={pending} onClick={() => remove(m)} aria-label="Șterge membrul" data-testid="team-delete">
                    <Trash2 className="size-4" />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {confirmDialog}
    </section>
  );
}

export function GalleryManager({ images }: { images: GalleryImage[] }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { pending, error, setError, run } = useAction();
  const [confirm, confirmDialog] = useConfirm();
  const busy = pending || progress !== null;

  async function addFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (!files.length || busy) return;
    const problems = files.map(checkFile).filter(Boolean);
    const valid = files.filter((f) => !checkFile(f));
    setError(problems.length ? problems.join(" · ") : null);
    if (!valid.length) return;
    setProgress({ done: 0, total: valid.length });
    const paths: string[] = [];
    for (const f of valid) {
      try {
        paths.push(await uploadImage("gallery", f));
      } catch (err) {
        setError(`${f.name}: ${err instanceof Error ? err.message : "încărcare eșuată"}`);
      }
      setProgress((p) => p && { ...p, done: p.done + 1 });
    }
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
    if (paths.length) run(() => addGalleryImages(paths));
  }

  async function remove(img: GalleryImage) {
    if (!(await confirm({ title: "Ștergi fotografia?", description: "Fotografia va dispărea din Galerie Foto.", confirmLabel: "Șterge" }))) return;
    run(() => deleteGalleryImage(img.id));
  }

  return (
    <section className={card} data-testid="gallery-manager">
      <h2 className="font-display text-2xl font-black">Galerie Foto</h2>
      <p className="mt-1 text-sm text-white/55">Fotografii reprezentative ale sălii. Poți selecta mai multe deodată.</p>

      <div
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
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
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-8 text-center transition ${
          dragging ? "border-neon-lime bg-neon-lime/5" : "border-white/15 hover:border-neon-violet/60 hover:shadow-neon"
        }`}
      >
        {busy ? <Loader2 className="size-8 animate-spin text-neon-violet" /> : <ImagePlus className="size-8 text-neon-violet" />}
        <p className="font-semibold">{progress ? `Se încarcă ${progress.done}/${progress.total}…` : "Adaugă fotografii"}</p>
        <p className="text-xs text-white/45">JPG, PNG, WEBP sau GIF, maximum {formatBytes(ABOUT_MAX_BYTES)} fiecare</p>
      </div>
      <input ref={fileRef} type="file" multiple accept={ABOUT_MIME.join(",")} className="hidden" data-testid="gallery-input" onChange={(e) => addFiles(e.target.files)} />
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.length === 0 && <li className="col-span-full text-sm text-white/45">Nicio fotografie încă.</li>}
        {images.map((img, i) => (
          <li key={img.id} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-graphite ring-1 ring-white/10" data-testid="gallery-item">
            <Image src={img.image_url} alt="" fill sizes="(min-width: 1024px) 240px, 45vw" className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-0.5 bg-gradient-to-t from-black/80 to-transparent p-2">
              <MoveButtons table="gallery_images" id={img.id} first={i === 0} last={i === images.length - 1} busy={pending} run={run} />
              <button type="button" className={`${iconBtn} hover:!bg-red-500/20 hover:!text-red-300`} disabled={pending} onClick={() => remove(img)} aria-label="Șterge fotografia" data-testid="gallery-delete">
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {confirmDialog}
    </section>
  );
}
