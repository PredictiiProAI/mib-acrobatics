import type { AccountType, TrainingLevel } from "@/lib/supabase/database.types";

export const LEVEL_LABEL: Record<TrainingLevel, string> = { beginner: "Începător", intermediate: "Intermediar", advanced: "Avansat" };
export const LEVELS = Object.keys(LEVEL_LABEL) as TrainingLevel[];
export const DISCIPLINE_SUGGESTIONS = ["Dans", "Gimnastică", "Parkour", "Cheerleading", "Circ", "Arte marțiale"];
export const ACCOUNT_TYPES: AccountType[] = ["Sportiv", "Părinte", "Antrenor"];
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
