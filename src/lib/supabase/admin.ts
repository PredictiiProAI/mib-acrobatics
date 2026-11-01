import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";

/** Service-role client (bypasses RLS). Server-only; null when the key isn't configured. */
export function createAdminClient() {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

/** Deletes everything a user uploaded under `<bucket>/<uid>/` (posts media, avatars). */
export async function removeUserFiles(admin: AdminClient, uid: string, buckets: string[]) {
  for (const name of buckets) {
    const bucket = admin.storage.from(name);
    for (;;) {
      const { data: files, error } = await bucket.list(uid, { limit: 1000 });
      if (error) {
        console.error("removeUserFiles list", name, error.message);
        break;
      }
      if (!files?.length) break;
      const { error: removeError } = await bucket.remove(files.map((f) => `${uid}/${f.name}`));
      if (removeError) {
        console.error("removeUserFiles remove", name, removeError.message);
        break;
      }
      if (files.length < 1000) break;
    }
  }
}
