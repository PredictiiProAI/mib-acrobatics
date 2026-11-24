import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { InboxList } from "@/components/chat/inbox-list";
import { NewMessage } from "@/components/chat/new-message";
import { requireUser } from "@/lib/auth";
import { enforceRequestedDocuments } from "@/lib/documents-gate";
import { getMemberDirectory, getMemberInbox } from "@/lib/messages";
import { isStaff } from "@/lib/roles";

export default async function MessagesLayout({ children }: LayoutProps<"/messages">) {
  const user = await requireUser("/messages");
  await enforceRequestedDocuments(user, "/messages");
  if (isStaff(user.role)) redirect("/dashboard/messages");
  const [conversations, members] = await Promise.all([getMemberInbox(user.id), getMemberDirectory(user.id)]);
  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-4 md:pb-4">
        <div className="flex h-[calc(100dvh-3.5rem-1px-env(safe-area-inset-bottom))] md:min-h-[28rem] gap-4 max-md:-mt-4 max-md:pt-[env(safe-area-inset-top)] md:h-[calc(100svh-6.5rem)]">
          <InboxList
            conversations={conversations}
            basePath="/messages"
            emptyText="Nicio conversație încă. Apasă „Mesaj nou” ca să scrii antrenorului sau unui coleg."
            action={<NewMessage members={members} />}
          />
          {children}
        </div>
      </main>
    </>
  );
}
