import type { AppRole } from "@/lib/supabase/database.types";

export type Viewer = { id: string; role: AppRole; badgeRole?: AppRole; name: string; avatarUrl: string | null };
