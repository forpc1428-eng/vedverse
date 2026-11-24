package com.vedant.vedverse;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Vedverse extras: precise location for the history timeline, payment auto-confirm (notification listener),
 * local reminders (bills / budget / weekly digest) and fingerprint/face unlock. Everything stays on the phone.
 */
@CapacitorPlugin(name = "VedExtras", permissions = {
        @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }, alias = "location"),
        @Permission(strings = { "android.permission.POST_NOTIFICATIONS" }, alias = "notify")
})
public class VedExtrasPlugin extends Plugin {
    static VedExtrasPlugin inst;
    static final String CH = "vv_remind";
    private final Handler main = new Handler(Looper.getMainLooper());

    @Override
    public void load() {
        inst = this;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel(CH) == null)
                nm.createNotificationChannel(new NotificationChannel(CH, "Reminders", NotificationManager.IMPORTANCE_DEFAULT));
        }
    }

    /* ------------------------------------------------ payment auto-confirm (shared parser) */
    private static final Pattern AMT = Pattern.compile("(?:₹|rs\\.?|inr)\\s?([0-9][0-9,]*(?:\\.[0-9]{1,2})?)", Pattern.CASE_INSENSITIVE);
    private static final Pattern OK = Pattern.compile("(paid|sent|debited|successful|success|transferred|payment of|you paid|money sent)", Pattern.CASE_INSENSITIVE);
    private static final Pattern NO = Pattern.compile("(failed|declined|reversed|credited to your|received from|requested|request of|refund)", Pattern.CASE_INSENSITIVE);

    static void inspect(Context c, String src, String pkg, String text, long t) {
        if (text == null || text.length() < 6) return;
        if (!OK.matcher(text).find() || NO.matcher(text).find()) return;
        Matcher m = AMT.matcher(text);
        if (!m.find()) return;
        try {
            double am = Double.parseDouble(m.group(1).replace(",", ""));
            JSONObject o = new JSONObject();
            o.put("src", src); o.put("pkg", pkg == null ? "" : pkg); o.put("amount", am);
            o.put("text", text.length() > 160 ? text.substring(0, 160) : text); o.put("t", t);
            SharedPreferences sp = c.getSharedPreferences("vv_confirms", Context.MODE_PRIVATE);
            JSONArray a = new JSONArray(sp.getString("q", "[]"));
            a.put(o);
            while (a.length() > 50) a.remove(0);
            sp.edit().putString("q", a.toString()).apply();
            VedExtrasPlugin p = inst;
            if (p != null) p.main.post(() -> { try { p.notifyListeners("confirm", JSObject.fromJSONObject(o)); } catch (Exception ignored) {} });
        } catch (Exception ignored) {}
    }

    @PluginMethod
    public void takeConfirms(PluginCall call) {
        SharedPreferences sp = getContext().getSharedPreferences("vv_confirms", Context.MODE_PRIVATE);
        JSObject r = new JSObject();
        try { r.put("items", new JSArray(sp.getString("q", "[]"))); } catch (Exception e) { r.put("items", new JSArray()); }
        sp.edit().putString("q", "[]").apply();
        call.resolve(r);
    }


    /* ------------------------------------------------ precise location */
    @PluginMethod
    public void getLocation(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) { requestPermissionForAlias("location", call, "locCb"); return; }
        locate(call);
    }

    @PermissionCallback
    private void locCb(PluginCall call) {
        if (getPermissionState("location") == PermissionState.GRANTED) locate(call); else call.reject("Location permission denied");
    }

    @SuppressWarnings("MissingPermission")
    private void locate(PluginCall call) {
        LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) { call.reject("No location service"); return; }
        Location best = null;
        for (String p : new String[] { LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER, "fused", LocationManager.PASSIVE_PROVIDER }) {
            try { Location l = lm.getLastKnownLocation(p); if (l != null && (best == null || l.getTime() > best.getTime())) best = l; } catch (Exception ignored) {}
        }
        final Location last = best;
        if (last != null && System.currentTimeMillis() - last.getTime() < 120000) { call.resolve(pack(last)); return; }
        final boolean[] done = { false };
        main.postDelayed(() -> { if (!done[0]) { done[0] = true; if (last != null) call.resolve(pack(last)); else call.reject("No fix"); } }, 9000);
        String prov = lm.isProviderEnabled(LocationManager.GPS_PROVIDER) ? LocationManager.GPS_PROVIDER : LocationManager.NETWORK_PROVIDER;
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                lm.getCurrentLocation(prov, null, ContextCompat.getMainExecutor(getContext()), l -> { if (done[0]) return; done[0] = true; if (l != null) call.resolve(pack(l)); else if (last != null) call.resolve(pack(last)); else call.reject("No fix"); });
            } else {
                lm.requestSingleUpdate(prov, new android.location.LocationListener() {
                    @Override public void onLocationChanged(Location l) { if (done[0]) return; done[0] = true; call.resolve(pack(l)); }
                    @Override public void onStatusChanged(String s, int i, android.os.Bundle b) {}
                    @Override public void onProviderEnabled(String s) {}
                    @Override public void onProviderDisabled(String s) {}
                }, Looper.getMainLooper());
            }
        } catch (Exception e) { if (!done[0]) { done[0] = true; if (last != null) call.resolve(pack(last)); else call.reject("No fix"); } }
    }

    private JSObject pack(Location l) {
        JSObject r = new JSObject();
        r.put("lat", l.getLatitude()); r.put("lon", l.getLongitude()); r.put("acc", l.getAccuracy()); r.put("t", l.getTime());
        return r;
    }

    /* ------------------------------------------------ local reminders */
    @PluginMethod
    public void notifyPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("notify") == PermissionState.GRANTED) { JSObject r = new JSObject(); r.put("granted", true); call.resolve(r); return; }
        requestPermissionForAlias("notify", call, "notifyCb");
    }

    @PermissionCallback
    private void notifyCb(PluginCall call) { JSObject r = new JSObject(); r.put("granted", getPermissionState("notify") == PermissionState.GRANTED); call.resolve(r); }

    @PluginMethod
    public void schedule(PluginCall call) {
        Context c = getContext();
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        SharedPreferences sp = c.getSharedPreferences("vv_alarms", Context.MODE_PRIVATE);
        SharedPreferences pay = c.getSharedPreferences(VedAlarmReceiver.PREF, Context.MODE_PRIVATE);
        try {
            JSONArray old = new JSONArray(sp.getString("ids", "[]"));
            for (int i = 0; i < old.length(); i++) am.cancel(pi(c, old.getInt(i)));
            SharedPreferences.Editor ed = pay.edit();
            for (int i = 0; i < old.length(); i++) ed.remove(String.valueOf(old.getInt(i)));
            JSONArray items = call.getArray("items", new JSArray());
            JSONArray ids = new JSONArray();
            for (int i = 0; i < items.length(); i++) {
                JSONObject it = items.getJSONObject(i);
                long at = it.getLong("at"); if (at < System.currentTimeMillis()) continue;
                int id = it.getInt("id");
                if (id >= 5000 && id < 6000) continue;          // reserved for snoozes
                ed.putString(String.valueOf(id), it.toString());
                PendingIntent p = pi(c, id);
                if (Build.VERSION.SDK_INT >= 23) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p); else am.set(AlarmManager.RTC_WAKEUP, at, p);
                ids.put(id);
            }
            ed.apply();
            sp.edit().putString("ids", ids.toString()).apply();
            JSObject r = new JSObject(); r.put("count", ids.length());
            call.resolve(r);
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    static PendingIntent pi(Context c, int id) {
        Intent i = new Intent(c, VedAlarmReceiver.class);
        i.putExtra("id", id);
        return PendingIntent.getBroadcast(c, 9000 + id, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** Show a notification right now (test button, live nudges). */
    @PluginMethod
    public void show(PluginCall call) {
        try {
            JSObject o = call.getData();
            int id = o.optInt("id", 3000);
            getContext().getSharedPreferences(VedAlarmReceiver.PREF, Context.MODE_PRIVATE).edit().putString(String.valueOf(id), o.toString()).apply();
            VedAlarmReceiver.post(getContext(), id, o);
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    @PluginMethod
    public void cancel(PluginCall call) { NotificationManagerCompat.from(getContext()).cancel(call.getInt("id", 0)); call.resolve(); }

    @PluginMethod
    public void notifStatus(PluginCall call) {
        JSObject r = new JSObject();
        r.put("enabled", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
        r.put("perm", Build.VERSION.SDK_INT < 33 ? "granted" : getPermissionState("notify").toString().toLowerCase());
        r.put("canAsk", Build.VERSION.SDK_INT >= 33 && getActivity() != null && getActivity().shouldShowRequestPermissionRationale("android.permission.POST_NOTIFICATIONS"));
        AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        r.put("exact", Build.VERSION.SDK_INT < 31 || (am != null && am.canScheduleExactAlarms()));
        call.resolve(r);
    }

    @PluginMethod
    public void openNotifSettings(PluginCall call) {
        try {
            Intent i;
            if (Build.VERSION.SDK_INT >= 26) { i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS); i.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName()); }
            else { i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, android.net.Uri.parse("package:" + getContext().getPackageName())); }
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Exception ignored) {}
        call.resolve();
    }

    @PluginMethod
    public void takeActions(PluginCall call) {
        SharedPreferences sp = getContext().getSharedPreferences("vv_actions", Context.MODE_PRIVATE);
        JSObject r = new JSObject();
        try { r.put("items", new JSArray(sp.getString("q", "[]"))); } catch (Exception e) { r.put("items", new JSArray()); }
        sp.edit().putString("q", "[]").apply();
        call.resolve(r);
    }

    @PluginMethod
    public void quickBar(PluginCall call) { VedAlarmReceiver.quickBar(getContext(), call.getBoolean("on", false), call.getString("name", "Vedverse")); call.resolve(); }

    static void emit(String ev, JSONObject o) {
        VedExtrasPlugin p = inst;
        if (p != null) p.main.post(() -> { try { p.notifyListeners(ev, JSObject.fromJSONObject(o)); } catch (Exception ignored) {} });
    }

    /* ------------------------------------------------ fingerprint / face unlock */
    @PluginMethod
    public void canBiometric(PluginCall call) {
        JSObject r = new JSObject();
        r.put("ok", BiometricManager.from(getContext()).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS);
        call.resolve(r);
    }

    @PluginMethod
    public void biometric(PluginCall call) {
        String title = call.getString("title", "Unlock Vedverse");
        main.post(() -> {
            try {
                FragmentActivity a = (FragmentActivity) getActivity();
                BiometricPrompt bp = new BiometricPrompt(a, ContextCompat.getMainExecutor(getContext()), new BiometricPrompt.AuthenticationCallback() {
                    @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult r) { JSObject o = new JSObject(); o.put("ok", true); call.resolve(o); }
                    @Override public void onAuthenticationError(int code, CharSequence msg) { JSObject o = new JSObject(); o.put("ok", false); o.put("error", String.valueOf(msg)); call.resolve(o); }
                });
                bp.authenticate(new BiometricPrompt.PromptInfo.Builder().setTitle(title).setSubtitle("Fingerprint or face").setNegativeButtonText("Use PIN")
                        .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK).build());
            } catch (Exception e) { JSObject o = new JSObject(); o.put("ok", false); o.put("error", e.getMessage()); call.resolve(o); }
        });
    }
}
