import type { AppRole } from "@/lib/supabase/database.types";

export type Viewer = { id: string; role: AppRole; name: string };
