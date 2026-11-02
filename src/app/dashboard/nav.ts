import {
  CalendarDays,
  CloudUpload,
  Images,
  Info,
  MessageCircle,
  MessagesSquare,
  Settings2,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/lib/supabase/database.types";

export type DashNavItem = { label: string; href: string; roles: AppRole[]; icon: LucideIcon; desc: string };

const ALL_PUBLISHERS: AppRole[] = ["media", "admin", "superadmin"];
const STAFF: AppRole[] = ["admin", "superadmin"];

// media sees only Upload + own posts; admin/superadmin see everything. The grid on /dashboard is the "Prezentare" view.
export const DASH_NAV: DashNavItem[] = [
  { label: "Upload Zone", href: "/dashboard/upload", roles: ALL_PUBLISHERS, icon: CloudUpload, desc: "Poze și video noi" },
  { label: "Postările mele", href: "/dashboard/posts", roles: ["media"], icon: Images, desc: "Editează sau șterge" },
  { label: "Moderare postări", href: "/dashboard/posts", roles: STAFF, icon: ShieldCheck, desc: "Toate postările" },
  { label: "Moderare comentarii", href: "/dashboard/comments", roles: STAFF, icon: MessagesSquare, desc: "Șterge comentarii" },
  { label: "Utilizatori", href: "/dashboard/users", roles: STAFF, icon: Users, desc: "Conturi, roluri, documente" },
  { label: "Mesaje", href: "/dashboard/messages", roles: STAFF, icon: MessageCircle, desc: "Conversații cu membrii" },
  { label: "Program & Grupe", href: "/dashboard/schedule", roles: STAFF, icon: CalendarDays, desc: "Ore, grupe, niveluri" },
  { label: "Setări AcroMib", href: "/dashboard/acrofeed", roles: STAFF, icon: Settings2, desc: "Mesaj, anunț, linkuri" },
  { label: "Editare Despre Noi", href: "/dashboard/about", roles: STAFF, icon: Info, desc: "Echipă și galerie" },
];

export const navFor = (role: AppRole) => DASH_NAV.filter((i) => i.roles.includes(role));
