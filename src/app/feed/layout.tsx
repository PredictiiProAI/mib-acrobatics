import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";

export default async function FeedLayout({ children }: LayoutProps<"/feed">) {
  const user = await requireUser("/feed");
  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-6 md:pb-10">{children}</main>
    </>
  );
}
