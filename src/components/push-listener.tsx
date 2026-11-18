"use client";

import { Capacitor } from "@capacitor/core";
import { Bell, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Banner = { title: string; body: string; url?: string };

/** Android app: creates the high-importance notification channel, opens links from tapped notifications and shows pushes that arrive while the app is open. */
export function PushListener() {
  const router = useRouter();
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("PushNotifications")) return;
    let cancelled = false;
    const handles: { remove: () => Promise<void> }[] = [];
    void (async () => {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      if (cancelled) return;
      if (Capacitor.getPlatform() === "android") {
        await PushNotifications.createChannel({
          id: "mib_alerts",
          name: "Program și antrenamente",
          description: "Modificări de program și memento înainte de antrenament",
          importance: 5,
          visibility: 1,
          vibration: true,
          lights: true,
          lightColor: "#8b00ff",
        }).catch(() => {});
      }
      handles.push(
        await PushNotifications.addListener("pushNotificationReceived", (n) => {
          const data = (n.data ?? {}) as { url?: string; title?: string; body?: string };
          if (data.url && data.url === window.location.pathname) return;
          setBanner({ title: n.title || data.title || "MIB Acrobatics", body: n.body || data.body || "", url: data.url });
          navigator.vibrate?.(200);
        }),
        await PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
          const url = (a.notification.data as { url?: string } | undefined)?.url;
          if (url) router.push(url);
        }),
      );
    })();
    return () => {
      cancelled = true;
      handles.forEach((h) => void h.remove());
    };
  }, [router]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 8000);
    return () => clearTimeout(t);
  }, [banner]);

  if (!banner) return null;
  return (
    <div className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[100] mx-auto max-w-md" role="status" data-testid="push-banner">
      <div className="flex items-start gap-3 rounded-2xl border border-neon-green/40 bg-black/95 p-3 text-white shadow-neon-sm">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          onClick={() => {
            if (banner.url) router.push(banner.url);
            setBanner(null);
          }}
        >
          <Bell className="mt-0.5 size-5 shrink-0 text-neon-green" />
          <span className="min-w-0">
            <span className="block text-sm font-bold">{banner.title}</span>
            {banner.body && <span className="mt-0.5 block text-xs text-white/70">{banner.body}</span>}
          </span>
        </button>
        <button type="button" onClick={() => setBanner(null)} aria-label="Închide" className="text-white/50 hover:text-white">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
