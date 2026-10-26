"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/roles";
import type { AppRole } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./posts";

const ROLES: AppRole[] = ["superadmin", "admin", "media", "user"];

/** Role rules live in public.admin_set_role (admin: user <-> media only; superadmin: anything). */
export async function setUserRole(target: string, role: AppRole): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me || !isStaff(me.role)) return { ok: false, error: "Nu ai acces la gestionarea utilizatorilor." };
  if (!ROLES.includes(role)) return { ok: false, error: "Rol invalid." };
  if (target === me.id) return { ok: false, error: "Nu îți poți schimba propriul rol." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", { target, new_role: role });
  if (error) {
    return { ok: false, error: error.code === "42501" ? "Nu ai dreptul să atribui acest rol." : "Rolul nu a putut fi schimbat." };
  }
  revalidatePath("/dashboard/users");
  return { ok: true };
}
