import { InstallAppButton } from "@/components/install-app-button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))]">
        <ThemeToggle compact />
      </div>
      <div className="mb-8">
        <Logo size="lg" />
      </div>
      <div className="glass w-full max-w-md rounded-3xl p-8">{children}</div>
      <InstallAppButton className="mt-6 w-full max-w-md" />
    </main>
  );
}
