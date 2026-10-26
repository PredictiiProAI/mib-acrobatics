"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DashNavItem } from "./nav";

export function NavLinks({ items }: { items: DashNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map((item) => {
        if (item.soon) {
          return (
            <span key={item.label} className="flex items-center justify-between whitespace-nowrap rounded-xl px-3 py-2 text-sm text-white/35">
              {item.label}
              <span className="ml-2 rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase">curând</span>
            </span>
          );
        }
        const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm transition ${
              active ? "bg-neon-orange/10 font-semibold text-neon-orange" : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
