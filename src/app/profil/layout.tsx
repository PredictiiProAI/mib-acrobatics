import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";

export default async function ProfileLayout({ children }: LayoutProps<"/profil">) {
  const user = await requireUser("/profil");
  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:pb-10">{children}</main>
    </>
  );
}
