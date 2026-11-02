/** Instant placeholder shown by loading.tsx while a dynamic page renders on the server. */
export function PageSkeleton({ variant = "list" }: { variant?: "list" | "feed" | "grid" }) {
  const block = "animate-pulse rounded-2xl border border-white/5 bg-white/[0.04]";
  return (
    <div className="space-y-5" role="status" aria-label="Se încarcă" data-testid="page-skeleton">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded-full bg-neon-orange/25" />
        <div className="h-8 w-56 max-w-full animate-pulse rounded-xl bg-white/10" />
      </div>
      {variant === "feed" ? (
        <div className="mx-auto w-full max-w-xl space-y-5">
          <div className={`${block} h-32`} />
          {[0, 1].map((i) => (
            <div key={i} className={`${block} aspect-[4/5]`} />
          ))}
        </div>
      ) : variant === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`${block} h-36`} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${block} h-20`} />
          ))}
        </div>
      )}
      <span className="sr-only">Se încarcă…</span>
    </div>
  );
}
