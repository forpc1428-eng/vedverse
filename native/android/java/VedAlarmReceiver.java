package com.vedant.vedverse;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.util.Base64;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Shows Vedverse notifications (scheduled or immediate) and handles their buttons.
 * Payload JSON (stored per id): title, body, url, emoji, sound (chime|default|silent), heads, vib (soft|strong|pulse|off),
 * color "#rrggbb", private, image (base64), actions [{act: snooze|paid|yes|no|url, label, url, ref}], ref.
 */
public class VedAlarmReceiver extends BroadcastReceiver {
    static final String ACT = "com.vedant.vedverse.NACT";
    static final String PREF = "vv_npay";

    @Override
    public void onReceive(Context c, Intent i) {
        try {
            int id = i.getIntExtra("id", 1);
            if (ACT.equals(i.getAction())) { onAction(c, id, i.getStringExtra("act"), i.getStringExtra("ref")); return; }
            String raw = c.getSharedPreferences(PREF, Context.MODE_PRIVATE).getString(String.valueOf(id), null);
            JSONObject o = raw != null ? new JSONObject(raw) : new JSONObject();
            if (raw == null) { o.put("title", i.getStringExtra("title")); o.put("body", i.getStringExtra("body")); o.put("url", i.getStringExtra("url")); }
            post(c, id, o);
        } catch (Exception ignored) { }
    }

    /* ---------------------------------------------------------------- buttons */
    private void onAction(Context c, int id, String act, String ref) {
        NotificationManagerCompat.from(c).cancel(id);
        try {
            if ("snooze".equals(act)) {
                SharedPreferences sp = c.getSharedPreferences(PREF, Context.MODE_PRIVATE);
                String raw = sp.getString(String.valueOf(id), null);
                if (raw == null) return;
                JSONObject o = new JSONObject(raw);
                int nid = 5000 + (id % 1000);
                sp.edit().putString(String.valueOf(nid), o.toString()).apply();
                AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
                long at = System.currentTimeMillis() + 60L * 60000L;
                PendingIntent p = VedExtrasPlugin.pi(c, nid);
                if (Build.VERSION.SDK_INT >= 23) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p); else am.set(AlarmManager.RTC_WAKEUP, at, p);
                return;
            }
            JSONObject e = new JSONObject();
            e.put("id", id); e.put("act", act); e.put("ref", ref == null ? "" : ref); e.put("t", System.currentTimeMillis());
            SharedPreferences sp = c.getSharedPreferences("vv_actions", Context.MODE_PRIVATE);
            JSONArray a = new JSONArray(sp.getString("q", "[]"));
            a.put(e);
            while (a.length() > 50) a.remove(0);
            sp.edit().putString("q", a.toString()).apply();
            VedExtrasPlugin.emit("notifAction", e);
        } catch (Exception ignored) { }
    }

    /* ---------------------------------------------------------------- channels */
    static long[] pattern(String vib) {
        if ("strong".equals(vib)) return new long[] { 0, 160, 90, 260 };
        if ("pulse".equals(vib)) return new long[] { 0, 60, 110, 60, 110, 60 };
        if ("off".equals(vib)) return null;
        return new long[] { 0, 45 };
    }

    static String channel(Context c, String sound, boolean heads, String vib) {
        if (sound == null || sound.isEmpty()) sound = "chime";
        if (vib == null || vib.isEmpty()) vib = "soft";
        String id = "vv_" + sound + (heads ? "_h_" : "_n_") + vib;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel(id) == null) {
                boolean silent = "silent".equals(sound);
                int imp = silent ? NotificationManager.IMPORTANCE_LOW : heads ? NotificationManager.IMPORTANCE_HIGH : NotificationManager.IMPORTANCE_DEFAULT;
                String name = (silent ? "Silent" : "chime".equals(sound) ? "Cosmic chime" : "Phone sound") + (heads ? " · pop-up" : "") + ("off".equals(vib) ? "" : " · " + vib + " buzz");
                NotificationChannel ch = new NotificationChannel(id, name, imp);
                ch.setDescription("Vedverse reminders and nudges");
                if (silent) ch.setSound(null, null);
                else if ("chime".equals(sound)) ch.setSound(chimeUri(c), new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
                long[] pat = pattern(vib);
                ch.enableVibration(pat != null && !silent);
                if (pat != null && !silent) ch.setVibrationPattern(pat);
                ch.enableLights(true); ch.setLightColor(0xFFF2A144);
                nm.createNotificationChannel(ch);
            }
        }
        return id;
    }

    static Uri chimeUri(Context c) { return Uri.parse("android.resource://" + c.getPackageName() + "/" + R.raw.vv_chime); }

    static PendingIntent open(Context c, int req, String url) {
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse(url == null || url.isEmpty() ? "vedverse://home" : url));
        open.setPackage(c.getPackageName());
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, req, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /* ---------------------------------------------------------------- show */
    static void post(Context c, int id, JSONObject o) {
        try {
            String sound = o.optString("sound", "chime"), vib = o.optString("vib", "soft");
            boolean heads = o.optBoolean("heads", false);
            String title = o.optString("title", "Vedverse"), body = o.optString("body", "");
            String emoji = o.optString("emoji", "");
            if (!emoji.isEmpty()) title = emoji + "  " + title;
            int color = 0xFFF2A144;
            try { String cs = o.optString("color", ""); if (!cs.isEmpty()) color = Color.parseColor(cs); } catch (Exception ignored) { }
            NotificationCompat.Builder b = new NotificationCompat.Builder(c, channel(c, sound, heads, vib))
                    .setSmallIcon(R.drawable.vv_ic_scan).setContentTitle(title).setContentText(body)
                    .setColor(color).setAutoCancel(true).setContentIntent(open(c, 7000 + id, o.optString("url", "vedverse://home")))
                    .setPriority(heads ? NotificationCompat.PRIORITY_HIGH : "silent".equals(sound) ? NotificationCompat.PRIORITY_LOW : NotificationCompat.PRIORITY_DEFAULT)
                    .setCategory(NotificationCompat.CATEGORY_REMINDER).setGroup("vv");
            if (Build.VERSION.SDK_INT < 26) {
                if ("chime".equals(sound)) b.setSound(chimeUri(c));
                else if ("default".equals(sound)) b.setDefaults(NotificationCompat.DEFAULT_SOUND);
                long[] pat = pattern(vib); if (pat != null && !"silent".equals(sound)) b.setVibrate(pat);
            }
            Bitmap img = null;
            String im = o.optString("image", "");
            if (!im.isEmpty()) {
                try { int k = im.indexOf(','); byte[] by = Base64.decode(k >= 0 ? im.substring(k + 1) : im, Base64.DEFAULT); img = BitmapFactory.decodeByteArray(by, 0, by.length); } catch (Exception ignored) { }
            }
            Bitmap appIc = appIcon(c);
            if (appIc != null) b.setLargeIcon(appIc);
            if (img != null) b.setStyle(new NotificationCompat.BigPictureStyle().bigPicture(img).bigLargeIcon((Bitmap) null).setSummaryText(body));
            else b.setStyle(new NotificationCompat.BigTextStyle().bigText(body));
            if (o.optBoolean("private", false)) {
                b.setVisibility(NotificationCompat.VISIBILITY_PRIVATE);
                b.setPublicVersion(new NotificationCompat.Builder(c, channel(c, sound, heads, vib)).setSmallIcon(R.drawable.vv_ic_scan)
                        .setContentTitle(o.optString("appName", "Vedverse")).setContentText(o.optString("publicText", "You have a new reminder")).setColor(color).build());
            } else b.setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            JSONArray acts = o.optJSONArray("actions");
            if (acts != null) for (int k = 0; k < acts.length() && k < 3; k++) {
                JSONObject a = acts.getJSONObject(k);
                String act = a.optString("act", "url"), label = a.optString("label", act);
                PendingIntent p;
                if ("url".equals(act)) p = open(c, 7100 + id * 4 + k, a.optString("url", "vedverse://home"));
                else {
                    Intent x = new Intent(c, VedAlarmReceiver.class).setAction(ACT);
                    x.putExtra("id", id); x.putExtra("act", act); x.putExtra("ref", a.optString("ref", o.optString("ref", "")));
                    p = PendingIntent.getBroadcast(c, 8100 + id * 4 + k, x, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
                }
                b.addAction(0, label, p);
            }
            NotificationManagerCompat.from(c).notify(id, b.build());
        } catch (SecurityException ignored) { } catch (Exception ignored) { }
    }

    /* ---------------------------------------------------------------- the icon you picked in Vedverse (Settings → icon & name) */
    static Bitmap appIcon(Context c) {
        try {
            int icon = c.getSharedPreferences("vv_identity", Context.MODE_PRIVATE).getInt("icon", 0);
            int res = icon <= 0 ? c.getResources().getIdentifier("ic_launcher", "mipmap", c.getPackageName())
                    : c.getResources().getIdentifier(String.format(java.util.Locale.US, "vv_ic_%02d", icon), "mipmap", c.getPackageName());
            if (res == 0) return null;
            android.graphics.drawable.Drawable d = androidx.core.content.ContextCompat.getDrawable(c, res);
            if (d == null) return null;
            int px = (int) (64 * c.getResources().getDisplayMetrics().density);
            Bitmap bm = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888);
            android.graphics.Canvas cv = new android.graphics.Canvas(bm);
            d.setBounds(0, 0, px, px); d.draw(cv);
            return bm;
        } catch (Exception e) { return null; }
    }

    /* ---------------------------------------------------------------- always-on quick bar */
    static final int BAR_ID = 4242;

    static void quickBar(Context c, boolean on) { quickBar(c, on, "Vedverse"); }
    static void quickBar(Context c, boolean on, String appName) {
        NotificationManagerCompat nm = NotificationManagerCompat.from(c);
        if (!on) { nm.cancel(BAR_ID); return; }
        try {
            String ch = "vv_bar";
            if (Build.VERSION.SDK_INT >= 26) {
                NotificationManager m = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
                if (m != null && m.getNotificationChannel(ch) == null) {
                    NotificationChannel nc = new NotificationChannel(ch, "Quick bar", NotificationManager.IMPORTANCE_LOW);
                    nc.setSound(null, null); nc.enableVibration(false); nc.setShowBadge(false);
                    m.createNotificationChannel(nc);
                }
            }
            NotificationCompat.Builder b = new NotificationCompat.Builder(c, ch)
                    .setSmallIcon(R.drawable.vv_ic_scan).setContentTitle(appName == null || appName.isEmpty() ? "Vedverse" : appName).setContentText("Scan · Receive · Pay — one tap away")
                    .setColor(0xFFF2A144).setOngoing(true).setShowWhen(false).setSilent(true).setPriority(NotificationCompat.PRIORITY_LOW)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC).setContentIntent(open(c, 6900, "vedverse://home")).setLargeIcon(appIcon(c))
                    .addAction(0, "Scan", open(c, 6901, "vedverse://scan"))
                    .addAction(0, "Receive", open(c, 6902, "vedverse://receive"))
                    .addAction(0, "Pay UPI ID", open(c, 6903, "vedverse://manual"));
            nm.notify(BAR_ID, b.build());
        } catch (SecurityException ignored) { } catch (Exception ignored) { }
    }

    static JSObject unused() { return new JSObject(); }
}
