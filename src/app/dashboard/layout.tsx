import { requireRole } from "@/lib/auth";
import { PUBLISHER_ROLES, ROLE_LABEL } from "@/lib/roles";
import { AdminHeader } from "./admin-header";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireRole(PUBLISHER_ROLES, "/dashboard");
  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader role={user.role} roleLabel={ROLE_LABEL[user.role]} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-6 sm:px-6 md:pt-8">{children}</main>
    </div>
  );
}
