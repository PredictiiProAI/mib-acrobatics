import Image from "next/image";
import Link from "next/link";
import logo from "../../public/mib-logo.png";

export function Logo({ href = "/", size = "md" }: { href?: string; size?: "md" | "lg" }) {
  return (
    <Link href={href} className="group inline-flex shrink-0 items-center" aria-label="MIB Acrobatics">
      <Image
        src={logo}
        alt="MIB Acrobatics"
        priority
        className={`aspect-square w-auto rounded-xl shadow-[0_0_18px_-2px_rgb(192_132_252/0.55)] ring-1 ring-white/10 transition group-hover:scale-[1.04] ${size === "lg" ? "h-20 rounded-2xl" : "h-11"}`}
      />
    </Link>
  );
}
