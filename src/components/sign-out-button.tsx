import { LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
      >
        <LogOut className="size-4" />
        {!compact && "Deconectare"}
      </button>
    </form>
  );
}
