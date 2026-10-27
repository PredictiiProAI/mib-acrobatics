import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { formatBytes, MAX_UPLOAD_BYTES } from "@/lib/media";
import { PUBLISHER_ROLES } from "@/lib/roles";
import { UploadZone } from "./upload-zone";

export const metadata: Metadata = { title: "Upload Zone" };

export default async function UploadPage() {
  const user = await requireRole(PUBLISHER_ROLES, "/dashboard/upload");
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-neon-purple">Upload Zone</p>
        <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">Încarcă media</h1>
        <p className="mt-2 text-white/60">
          Fotografii (JPG, PNG, WEBP, GIF, HEIC) și videoclipuri (MP4, MOV, WEBM), maxim {formatBytes(MAX_UPLOAD_BYTES)} per fișier.
          Fiecare fișier devine o postare în AcroFeed.
        </p>
      </div>
      <UploadZone userId={user.id} />
    </div>
  );
}
