#!/usr/bin/env bash
# Local one-command build. Needs: Node 20+, JDK 21, Android SDK (ANDROID_HOME set).
set -euo pipefail
cd "$(dirname "$0")"
echo "✦ Installing dependencies…"; npm install --no-audit --no-fund
if [ ! -d android ]; then echo "✦ Creating Android project…"; npx cap add android; fi
node scripts/patch-android.mjs
npx @capacitor/assets generate --android --iconBackgroundColor '#020307' --iconBackgroundColorDark '#020307' --splashBackgroundColor '#020307' --splashBackgroundColorDark '#020307'
npx cap sync android
echo "✦ Building signed APK…"; (cd android && chmod +x gradlew && ./gradlew assembleRelease)
cp android/app/build/outputs/apk/release/app-release.apk Vedverse.apk
echo "✓ Done → $(pwd)/Vedverse.apk"
command -v adb >/dev/null && adb devices | grep -q "device$" && { echo "✦ Phone detected, installing…"; adb install -r Vedverse.apk; } || true
