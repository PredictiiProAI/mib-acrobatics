"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Capacitor } from "@capacitor/core";
import { registerPushToken, unregisterPushToken } from "@/lib/actions/push";
import { FIREBASE_VAPID_KEY, FIREBASE_WEB_CONFIG, isWebPushConfigured } from "@/lib/push-config";

const KEY = "mib-push-token";
const EVENT = "mib-push-change";
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};
const setStored = (token: string | null) => {
  if (token) localStorage.setItem(KEY, token);
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
};

async function nativeToken(): Promise<string> {
  if (!Capacitor.isPluginAvailable("PushNotifications")) throw new Error("Versiunea instalată a aplicației nu are notificări push. Actualizează MIB Acrobatics din Google Play, apoi încearcă din nou.");
  const { PushNotifications } = await import("@capacitor/push-notifications");
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") throw new Error("Ai refuzat notificările. Le poți porni din Setări → Aplicații → MIB Acrobatics → Notificări.");
  return new Promise<string>((resolve, reject) => {
    void PushNotifications.addListener("registration", (t) => resolve(t.value));
    void PushNotifications.addListener("registrationError", (e) => reject(new Error(e.error)));
    void PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
      const url = (a.notification.data as { url?: string } | undefined)?.url;
      if (url) window.location.href = url;
    });
    void PushNotifications.register();
  });
}

async function webToken(): Promise<string> {
  const [{ getApps, initializeApp }, { getMessaging, getToken, isSupported }] = await Promise.all([import("firebase/app"), import("firebase/messaging")]);
  if (!(await isSupported()) || !("Notification" in window)) throw new Error("Browserul acesta nu suportă notificări push. Pe iPhone, adaugă întâi site-ul pe ecranul principal.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Ai refuzat notificările. Le poți porni din setările browserului pentru acest site.");
  const app = getApps().find((a) => a.name === "mib-push") ?? initializeApp(FIREBASE_WEB_CONFIG, "mib-push");
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  await navigator.serviceWorker.ready;
  return getToken(getMessaging(app), { vapidKey: FIREBASE_VAPID_KEY, serviceWorkerRegistration: registration });
}

/** Turns push notifications on/off for this device (Android app via Capacitor, browsers via Firebase web push). */
export function PushToggle({ compact = false }: { compact?: boolean }) {
  const token = useSyncExternalStore(subscribe, () => localStorage.getItem(KEY), () => null);
  const supported = useSyncExternalStore(subscribe, () => Capacitor.isNativePlatform() || isWebPushConfigured, () => false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (!supported) return null;

  const enable = () =>
    startTransition(async () => {
      setError(null);
      try {
        const native = Capacitor.isNativePlatform();
        const t = native ? await nativeToken() : await webToken();
        const res = await registerPushToken(t, native ? (Capacitor.getPlatform() === "ios" ? "ios" : "android") : "web");
        if (!res.ok) throw new Error(res.error);
        setStored(t);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Notificările nu au putut fi activate.");
      }
    });

  const disable = () =>
    startTransition(async () => {
      setError(null);
      if (token) await unregisterPushToken(token);
      setStored(null);
    });

  return (
    <div className={compact ? "" : "mt-4 rounded-2xl border border-white/10 bg-black/30 p-4"} data-testid="push-toggle">
      {!compact && (
        <p className="text-sm text-white">
          Notificări push pe acest dispozitiv
          <span className="mt-0.5 block text-xs text-white/50">Modificări de program și memento cu o oră înainte de antrenamentele confirmate.</span>
        </p>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={token ? disable : enable}
        data-testid={token ? "push-disable" : "push-enable"}
        className={`${compact ? "" : "mt-3 "}inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition active:scale-95 disabled:opacity-60 ${
          token ? "border border-white/15 text-white/80 hover:bg-white/5" : "bg-neon-orange text-onaccent shadow-neon-sm hover:shadow-neon"
        }`}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : token ? <BellOff className="size-4" /> : <Bell className="size-4" />}
        {token ? "Oprește notificările push" : "Activează notificările push"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
