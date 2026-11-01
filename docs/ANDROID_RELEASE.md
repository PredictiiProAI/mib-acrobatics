# Android release (Google Play)

The Android app is a Capacitor 8 shell (`capacitor.config.ts`) that loads the live site
`https://mib-acrobatics.vercel.app`, so web changes reach the app on every Vercel deploy without a new
store release. A new `.aab` is only needed for native changes (icon, splash, app name, Capacitor plugins, SDK levels).

- Package / application ID: `ro.mibacrobatics.app` (permanent once uploaded to Play)
- `minSdkVersion 24`, `targetSdkVersion 36`, `compileSdkVersion 36` (`android/variables.gradle`)
- Version: `versionCode` / `versionName` in `android/app/build.gradle` (bump `versionCode` for every upload)
- Icon and splash sources: `assets/` (regenerate with `npx @capacitor/assets generate --android`);
  Play listing icon `assets/play-store-icon-512.png`, feature graphic `assets/play-feature-graphic-1024x500.png`

## Signing

The upload keystore (`mib-release.jks`, alias `mib-release`) and its passwords are never committed.
Put `mib-release.jks` and `keystore.properties` in `android/` (both git-ignored):

```properties
storeFile=mib-release.jks
storePassword=...
keyAlias=mib-release
keyPassword=...
```

`storeFile` is resolved relative to `android/`. CI can instead set `MIB_KEYSTORE_FILE`, `MIB_KEYSTORE_PASSWORD`,
`MIB_KEY_ALIAS`, `MIB_KEY_PASSWORD` (or `MIB_KEYSTORE_PROPERTIES` pointing to a properties file).

Upload certificate SHA-256:
`DF:83:8A:16:30:12:07:DD:F5:31:EC:32:C7:B8:27:29:EB:D0:59:17:42:AE:08:0F:46:4C:CF:03:7E:89:3E:0E`

Keep Play App Signing enabled (the default): Google holds the app signing key and this keystore is only the
upload key, so a lost upload key can be reset from Play Console.

## Build

Requirements: JDK 21, Android SDK (platform 36, build-tools 36), Node 20+.

```bash
npm ci
npx cap sync android
cd android
./gradlew bundleRelease
# -> android/app/build/outputs/bundle/release/app-release.aab
```

Verify the signature: `jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab`.
