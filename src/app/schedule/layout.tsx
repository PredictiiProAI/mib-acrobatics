import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";

export default async function ScheduleLayout({ children }: LayoutProps<"/schedule">) {
  const user = await requireUser("/schedule");
  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 lg:pb-10">{children}</main>
    </>
  );
}
