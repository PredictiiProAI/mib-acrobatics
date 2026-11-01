/** Round avatar with the brand violet→lime ring; shows the photo or the name's initial. */
export function Avatar({ name, url, className = "size-10", textClassName = "text-sm" }: { name: string; url?: string | null; className?: string; textClassName?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-neon-orange to-neon-green p-[2px] ${className}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full rounded-full bg-black object-cover" />
      ) : (
        <span className={`grid size-full place-items-center rounded-full bg-black font-display font-black text-white ${textClassName}`}>{name[0]?.toUpperCase()}</span>
      )}
    </span>
  );
}
