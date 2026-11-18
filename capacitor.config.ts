import type { CapacitorConfig } from "@capacitor/cli";

const SITE_URL = process.env.CAP_SERVER_URL || "https://mib-acrobatics.vercel.app";

const config: CapacitorConfig = {
  appId: "ro.mibacrobatics.app",
  appName: "MIB Acrobatics",
  // The app is server-rendered on Vercel; the WebView loads the live site. capacitor-www is only an offline fallback.
  webDir: "capacitor-www",
  server: {
    url: SITE_URL,
    cleartext: false,
    allowNavigation: ["mib-acrobatics.vercel.app", "*.supabase.co"],
  },
  android: {
    backgroundColor: "#000000",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
