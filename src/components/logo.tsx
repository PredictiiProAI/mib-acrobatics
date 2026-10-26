import Image from "next/image";
import Link from "next/link";
import logo from "../../public/mib-logo.png";

export function Logo({ href = "/", size = "md" }: { href?: string; size?: "md" | "lg" }) {
  return (
    <Link href={href} className="group inline-flex items-center" aria-label="MIB Acrobatics">
      <Image
        src={logo}
        alt="MIB Acrobatics"
        priority
        className={`w-auto drop-shadow-[0_0_14px_rgb(255_106_0/0.35)] transition group-hover:scale-[1.03] ${size === "lg" ? "h-20" : "h-11"}`}
      />
    </Link>
  );
}
