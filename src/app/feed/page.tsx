import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/roles";

export const metadata: Metadata = { title: "AcroFeed" };

export default async function FeedPage() {
  const user = await getSessionUser();
  return (
    <div className="glass rounded-3xl p-8 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-neon-green">AcroFeed</p>
      <h1 className="mt-2 font-display text-3xl font-black">Salut, {user?.fullName ?? "sportivule"}!</h1>
      <p className="mt-2 text-white/60">
        Ești conectat ca <span className="text-neon-orange">{user ? ROLE_LABEL[user.role] : ""}</span>. Feed-ul cu
        videoclipuri, like-uri și comentarii vine în pasul următor.
      </p>
    </div>
  );
}
