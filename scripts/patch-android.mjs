// Injects Vedverse's native layer into the generated Capacitor Android project.
// Safe to run repeatedly (idempotent).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const A = path.join(ROOT, 'android', 'app');
const MAIN = path.join(A, 'src', 'main');
const PKG = 'com.vedant.vedverse';
const JAVA = path.join(MAIN, 'java', ...PKG.split('.'));
if (!fs.existsSync(MAIN)) { console.error('android/ not found. Run: npx cap add android'); process.exit(1); }

const copyDir = (src, dst) => {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f), d = path.join(dst, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
};
// 1. Java sources (MainActivity is replaced so our plugin is registered)
copyDir(path.join(ROOT, 'native', 'android', 'java'), JAVA);
// 2. resources
copyDir(path.join(ROOT, 'native', 'android', 'res'), path.join(MAIN, 'res'));

// 3. AndroidManifest
const mf = path.join(MAIN, 'AndroidManifest.xml');
let m = fs.readFileSync(mf, 'utf8');
const once = (marker, fn) => { if (!m.includes(marker)) m = fn(m); };

once('<!-- vv:perms -->', s => s.replace(/<application/, `<!-- vv:perms -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
    <queries>
        <intent><action android:name="android.intent.action.VIEW" /><data android:scheme="upi" /></intent>
        <package android:name="com.google.android.apps.nbu.paisa.user" />
        <package android:name="com.phonepe.app" />
        <package android:name="net.one97.paytm" />
        <package android:name="in.org.npci.upiapp" />
        <package android:name="com.dreamplug.androidapp" />
        <package android:name="in.amazon.mShop.android.shopping" />
        <package android:name="com.naviapp" />
        <package android:name="money.super.payments" />
        <package android:name="com.mobikwik_new" />
        <package android:name="com.whatsapp" />
    </queries>
    <application`));

// deep links + shortcuts inside MainActivity (after its launcher intent-filter)
once('<!-- vv:links -->', s => s.replace(/(<category android:name="android.intent.category.LAUNCHER"\s*\/>\s*<\/intent-filter>)/, `$1
            <!-- vv:links -->
            <intent-filter android:autoVerify="false">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="vedverse" />
            </intent-filter>
            <!-- lets Vedverse open upi:// links from any QR app or browser -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="upi" android:host="pay" />
            </intent-filter>
            <meta-data android:name="android.app.shortcuts" android:resource="@xml/vv_shortcuts" />`));

// home-screen widgets: one launcher entry per design in native/android/widgets.json (regenerated every run)
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const WIDGETS = JSON.parse(fs.readFileSync(path.join(ROOT, 'native', 'android', 'widgets.json'), 'utf8'));
const cellDp = (n) => Math.max(40, 70 * n - 30);
fs.mkdirSync(path.join(MAIN, 'res', 'xml'), { recursive: true });
for (const wd of WIDGETS) {
  fs.writeFileSync(path.join(MAIN, 'res', 'xml', `vv_hw_${wd.key}.xml`), `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="${cellDp(wd.cw)}dp" android:minHeight="${cellDp(wd.ch)}dp" android:targetCellWidth="${wd.cw}" android:targetCellHeight="${wd.ch}"
    android:minResizeWidth="40dp" android:minResizeHeight="40dp" android:resizeMode="horizontal|vertical"
    android:updatePeriodMillis="1800000" android:initialLayout="@layout/vv_hw_loading" android:previewLayout="@layout/vv_hw_preview"
    android:previewImage="@drawable/vv_widget_preview" android:widgetCategory="home_screen" android:description="@string/vv_hw_${wd.key}_d"/>
`);
}
fs.writeFileSync(path.join(MAIN, 'res', 'values', 'vv_hw_strings.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${WIDGETS.map(wd => `    <string name="vv_hw_${wd.key}_d">${esc(wd.desc).replace(/'/g, "\\'")}</string>`).join('\n')}\n</resources>\n`);
for (const f of ['budget', 'today', 'safe', 'last', 'scan', 'favs']) { const p = path.join(MAIN, 'res', 'xml', `vv_widget_${f}.xml`); if (fs.existsSync(p)) fs.unlinkSync(p); }
const receivers = WIDGETS.map(wd => `
        <receiver android:name=".VedWidgets$${wd.cls}" android:exported="false" android:label="${esc(wd.label)}">
            <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/vv_hw_${wd.key}" />
        </receiver>`).join('');
m = m.replace(/<!-- vv:widgets[\s\S]*?(?=<\/application>)/, '');
m = m.replace(/<\/application>/, `<!-- vv:widgets -->${receivers}
        <service android:name=".VedScanTile" android:exported="true" android:label="Scan &amp; Pay" android:icon="@drawable/vv_ic_scan" android:permission="android.permission.BIND_QUICK_SETTINGS_TILE">
            <intent-filter><action android:name="android.service.quicksettings.action.QS_TILE" /></intent-filter>
            <meta-data android:name="android.service.quicksettings.ACTIVE_TILE" android:value="false" />
        </service>
    </application>`);
// extras: precise location, payment auto-confirm (notifications only — no SMS access), reminders, biometric unlock
m = m.replace(/<!-- vv:extras-perms -->[\s\S]*?(?=<application)/, '');
m = m.replace(/\s*<uses-permission android:name="android\.permission\.(RECEIVE_SMS|READ_SMS)" \/>/g, '');
m = m.replace(/<application/, `<!-- vv:extras-perms -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <application`);
m = m.replace(/\s*<!-- vv:extras -->[\s\S]*?<!-- \/vv:extras -->/, '');
m = m.replace(/<\/application>/, `
        <!-- vv:extras -->
        <receiver android:name=".VedAlarmReceiver" android:exported="false" />
        <!-- /vv:extras -->
    </application>`);
// app icon & name packs: one launcher entry (activity-alias) per icon × name; exactly one is enabled at a time.
// The launcher entry moves off MainActivity onto the aliases (deep links / widgets / tile still target MainActivity).
const CAT = JSON.parse(fs.readFileSync(path.join(ROOT, 'www', 'assets', 'appicons', 'catalog.json'), 'utf8'));
const xmlAttr = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');
m = m.replace(/(<activity[^>]*?android:name="\.MainActivity"[\s\S]*?)<intent-filter>\s*<action android:name="android\.intent\.action\.MAIN"\s*\/>\s*<category android:name="android\.intent\.category\.LAUNCHER"\s*\/>\s*<\/intent-filter>/, '$1');
m = m.replace(/(<activity[^>]*?android:name="\.MainActivity"[\s\S]*?)<meta-data android:name="android\.app\.shortcuts" android:resource="@xml\/vv_shortcuts" \/>/, '$1');
m = m.replace(/\s*<!-- vv:aliases -->[\s\S]*?<!-- \/vv:aliases -->/, '');
let aliases = '';
// Android caps launcher entries (~1000), so only the catalog's `launcher` names get app-drawer entries;
// every other name is applied as a pinned home-screen shortcut by the app.
const LAUNCH = CAT.launcher || CAT.names.map((_, i) => i).slice(0, 12);
for (const ic of CAT.icons) for (const ni of LAUNCH) {
  const on = ic.id === CAT.default.icon && ni === CAT.default.name;
  const res = ic.id === 0 ? ['@mipmap/ic_launcher', '@mipmap/ic_launcher_round'] : [`@mipmap/vv_ic_${pad(ic.id)}`, `@mipmap/vv_ic_${pad(ic.id)}`];
  aliases += `
        <activity-alias android:name=".A${pad(ic.id)}_${pad(ni)}" android:targetActivity=".MainActivity" android:enabled="${on}" android:exported="true" android:icon="${res[0]}" android:roundIcon="${res[1]}" android:label="${xmlAttr(CAT.names[ni])}">
            <intent-filter><action android:name="android.intent.action.MAIN" /><category android:name="android.intent.category.LAUNCHER" /></intent-filter>
            <meta-data android:name="android.app.shortcuts" android:resource="@xml/vv_shortcuts" />
        </activity-alias>`;
}
m = m.replace(/<\/application>/, `\n        <!-- vv:aliases -->${aliases}\n        <!-- /vv:aliases -->\n    </application>`);
// keep the activity in portrait & resize for keyboard
m = m.replace(/(<activity[^>]*?android:name="\.MainActivity"[^>]*?)(>)/s, (all, a, b) => a.includes('screenOrientation') ? all : `${a}\n            android:screenOrientation="portrait"\n            android:windowSoftInputMode="adjustResize"${b}`);
fs.writeFileSync(mf, m);

// 4. build.gradle: stable release signing (so updates install over each other and keep your data) + lint relax
const bg = path.join(A, 'build.gradle');
let g = fs.readFileSync(bg, 'utf8');
if (!g.includes('vv:signing')) {
  g = g.replace(/(\n\s*buildTypes\s*\{)/, `
    // vv:signing (passwords come from env vars or keystore/signing.properties, which is git-ignored)
    def vvSign = new Properties()
    def vvSignFile = file("\${rootDir}/../keystore/signing.properties")
    if (vvSignFile.exists()) vvSignFile.withInputStream { vvSign.load(it) }
    signingConfigs {
        release {
            storeFile file(System.getenv("VV_KEYSTORE") ?: "\${rootDir}/../keystore/vedverse-release.jks")
            storePassword System.getenv("VV_STORE_PASS") ?: vvSign.getProperty("storePassword", "")
            keyAlias System.getenv("VV_KEY_ALIAS") ?: vvSign.getProperty("keyAlias", "vedverse")
            keyPassword System.getenv("VV_KEY_PASS") ?: vvSign.getProperty("keyPassword", "")
        }
    }
    lint {
        abortOnError false
        checkReleaseBuilds false
    }$1`);
  g = g.replace(/(buildTypes\s*\{\s*release\s*\{)/, `$1\n            signingConfig signingConfigs.release`);
  fs.writeFileSync(bg, g);
}
// 5. VedScan: CameraX + bundled ML Kit barcode model (no Play-Services download before the first scan)
g = fs.readFileSync(bg, 'utf8');
if (!g.includes('vv:scan-deps')) {
  g = g.replace(/(\ndependencies\s*\{)/, `$1
    // vv:scan-deps
    def camerax = "1.4.2"
    implementation "androidx.camera:camera-core:$camerax"
    implementation "androidx.camera:camera-camera2:$camerax"
    implementation "androidx.camera:camera-lifecycle:$camerax"
    implementation "androidx.camera:camera-view:$camerax"
    implementation "com.google.mlkit:barcode-scanning:17.3.0"`);
  fs.writeFileSync(bg, g);
}
// 5c. biometric prompt
g = fs.readFileSync(bg, 'utf8');
if (!g.includes('vv:bio-deps')) { g = g.replace(/(\ndependencies\s*\{)/, `$1
    // vv:bio-deps
    implementation "androidx.biometric:biometric:1.1.0"`); fs.writeFileSync(bg, g); }
// 5b. ZXing: native QR encoder for "Receive money"
g = fs.readFileSync(bg, 'utf8');
if (!g.includes('vv:qr-deps')) {
  g = g.replace(/(\ndependencies\s*\{)/, `$1\n    // vv:qr-deps\n    implementation "com.google.zxing:core:3.5.3"`);
  fs.writeFileSync(bg, g);
}
// 6. dark launch: Android 12+ splash background + window background (no light/white flash on open)
const sty = path.join(MAIN, 'res', 'values', 'styles.xml');
if (fs.existsSync(sty)) {
  let st = fs.readFileSync(sty, 'utf8');
  if (!st.includes('vv:dark')) {
    st = st.replace(/(<style name="AppTheme\.NoActionBarLaunch"[^>]*>)/, `$1\n        <!-- vv:dark -->\n        <item name="windowSplashScreenBackground">#020307</item>\n        <item name="android:windowBackground">#020307</item>`);
    st = st.replace(/(<style name="AppTheme\.NoActionBar"[^>]*>)/, `$1\n        <item name="android:windowBackground">#020307</item>`);
    fs.writeFileSync(sty, st);
  }
}
console.log('✓ Vedverse native layer patched into android/');
