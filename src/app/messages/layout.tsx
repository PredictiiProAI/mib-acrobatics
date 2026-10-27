import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/roles";

export default async function MessagesLayout({ children }: LayoutProps<"/messages">) {
  const user = await requireUser("/messages");
  if (isStaff(user.role)) redirect("/dashboard/messages");
  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-24 pt-4 lg:pb-4">{children}</main>
    </>
  );
}
