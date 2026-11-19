package com.vedant.vedverse;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.text.TextPaint;
import android.text.TextUtils;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Vedverse home-screen widget engine.
 *
 * Every widget on the home screen renders a JSON *spec* that the app owns and pushes (Widget Studio
 * edits them visually or as code). Native code only knows how to draw a spec:
 *   layout  orb | center | grid | flip | chart | minimal
 *   bg      void | glass | nebula | aurora | solid      a1 / a2 / text colours, radius, stars, rings
 *   orb     hole | glow | none                          title / big / sub / center: "{key}" templates
 *   bar     data key 0..100 for a progress bar          actions[] up to 8  {label, icon, url | app}
 *   pages[] for flip cards                              chart week | cats, clock, tap url
 * Static art (background, black hole, text, icons, charts) is painted into bitmaps; motion comes from
 * what launchers allow inside widgets: indeterminate ProgressBars driving rotating orbit rings, a
 * pulsing core glow and twinkling star tiles, plus a ViewFlipper that slides cards and a live TextClock.
 */
public class VedWidgets {
    public static final String PREFS = "vedverse_widgets";

    /* --------------------------------------------------------------- registry */
    public static abstract class Base extends AppWidgetProvider {
        abstract String key();
        @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) { for (int id : ids) safeRender(c, m, id, key()); }
        @Override public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle o) { safeRender(c, m, id, key()); }
    }
    public static class Budget extends Base { String key() { return "budget"; } }
    public static class Today extends Base { String key() { return "today"; } }
    public static class Safe extends Base { String key() { return "safe"; } }
    public static class Last extends Base { String key() { return "last"; } }
    public static class Scan extends Base { String key() { return "scan"; } }
    public static class Favs extends Base { String key() { return "favs"; } }
    public static class Horizon extends Base { String key() { return "horizon"; } }
    public static class Deck extends Base { String key() { return "deck"; } }
    public static class Strip extends Base { String key() { return "strip"; } }
    public static class Amounts extends Base { String key() { return "amounts"; } }
    public static class Apps extends Base { String key() { return "apps"; } }
    public static class Pulse extends Base { String key() { return "pulse"; } }
    public static class Clock extends Base { String key() { return "clock"; } }
    public static class Week extends Base { String key() { return "week"; } }
    public static class Cats extends Base { String key() { return "cats"; } }
    public static class Goal extends Base { String key() { return "goal"; } }
    public static class Pending extends Base { String key() { return "pending"; } }
    public static class Minimal extends Base { String key() { return "minimal"; } }
    public static class Single extends Base { String key() { return "single"; } }
    public static class Recent extends Base { String key() { return "recent"; } }
    public static class MonthRing extends Base { String key() { return "ring"; } }
    public static class Meter extends Base { String key() { return "meter"; } }
    public static class Custom1 extends Base { String key() { return "custom1"; } }
    public static class Custom2 extends Base { String key() { return "custom2"; } }
    public static class Custom3 extends Base { String key() { return "custom3"; } }
    public static class Custom4 extends Base { String key() { return "custom4"; } }

    static final String[] KEYS = { "budget", "today", "safe", "last", "scan", "favs", "horizon", "deck", "strip", "amounts", "apps", "pulse", "clock", "week", "cats", "goal", "pending", "minimal", "single", "recent", "ring", "meter", "custom1", "custom2", "custom3", "custom4" };
    static final Class<?>[] CLS = { Budget.class, Today.class, Safe.class, Last.class, Scan.class, Favs.class, Horizon.class, Deck.class, Strip.class, Amounts.class, Apps.class, Pulse.class, Clock.class, Week.class, Cats.class, Goal.class, Pending.class, Minimal.class, Single.class, Recent.class, MonthRing.class, Meter.class, Custom1.class, Custom2.class, Custom3.class, Custom4.class };

    public static Class<?> classFor(String key) { for (int i = 0; i < KEYS.length; i++) if (KEYS[i].equals(key)) return CLS[i]; return null; }

    public static JSONObject counts(Context c) {
        JSONObject o = new JSONObject();
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int i = 0; i < KEYS.length; i++) {
            try { o.put(KEYS[i], m.getAppWidgetIds(new ComponentName(c, CLS[i])).length); } catch (Exception ignored) {}
        }
        return o;
    }

    public static void updateAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (int i = 0; i < KEYS.length; i++) {
            int[] ids = m.getAppWidgetIds(new ComponentName(c, CLS[i]));
            for (int id : ids) safeRender(c, m, id, KEYS[i]);
        }
    }

    static JSONObject data(Context c) {
        try { return new JSONObject(c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("data", "{}")); }
        catch (Exception e) { return new JSONObject(); }
    }

    static void safeRender(Context c, AppWidgetManager m, int id, String key) {
        try { render(c, m, id, key); } catch (Throwable t) { android.util.Log.e("VedWidgets", "render " + key, t); }
    }

    /* --------------------------------------------------------------- geometry shared with the XML layouts (dp) */
    static final float ORB_BOX = 92, ORB_M = 10, SLIM_BOX = 52, SLIM_M = 8, CENTER_BOX = 128, CENTER_SM = 88, BADGE = 26, BADGE_M = 10, GRID_PAD = 8, GRID_HEAD = 30, CELL_M = 3;

    static void render(Context c, AppWidgetManager m, int id, String key) {
        JSONObject d = data(c);
        JSONObject specs = d.optJSONObject("specs");
        JSONObject sp = specs != null ? specs.optJSONObject(key) : null;
        if (sp == null) sp = fallback(key);
        Bundle o = m.getAppWidgetOptions(id);
        float dens = c.getResources().getDisplayMetrics().density;
        int wDp = o != null ? o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0) : 0;
        int hDp = o != null ? o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0) : 0;
        if (wDp <= 0) wDp = 250;
        if (hDp <= 0) hDp = 110;
        m.updateAppWidget(id, new R2(c, d, sp, key, id, wDp, hDp, dens).build());
    }

    static JSONObject fallback(String key) {
        JSONObject s = new JSONObject();
        try {
            s.put("layout", key.startsWith("custom") ? "center" : "orb");
            s.put("bg", "void"); s.put("orb", "hole");
            s.put("title", "VEDVERSE"); s.put("big", "Open app"); s.put("sub", "to sync this widget"); s.put("center", "V");
            s.put("tap", "vedverse://home");
        } catch (Exception ignored) {}
        return s;
    }

    /* --------------------------------------------------------------- one render pass */
    static final class R2 {
        final Context c; final JSONObject d, sp, f, th; final String key; final int id; final float wDp, hDp, s; final int W, H;
        final int a1, a2, txt, muted, bg0, bg1, hot; final float rad;
        final Typeface bold = Typeface.create("sans-serif", Typeface.BOLD), med = Typeface.create("sans-serif-medium", Typeface.NORMAL), reg = Typeface.create("sans-serif", Typeface.NORMAL);

        R2(Context c, JSONObject d, JSONObject sp, String key, int id, int wDp, int hDp, float dens) {
            this.c = c; this.d = d; this.sp = sp; this.key = key; this.id = id; this.wDp = wDp; this.hDp = hDp;
            this.s = Math.min(dens, 920f / Math.max(wDp, hDp));
            W = Math.max(8, Math.round(wDp * s)); H = Math.max(8, Math.round(hDp * s));
            JSONObject ff = d.optJSONObject("f"); f = ff != null ? ff : new JSONObject();
            JSONObject t = d.optJSONObject("theme"); th = t != null ? t : new JSONObject();
            a1 = col(sp.optString("a1", th.optString("a1", "#f2a144")), 0xfff2a144);
            a2 = col(sp.optString("a2", th.optString("a2", "#a9dcff")), 0xffa9dcff);
            txt = col(sp.optString("text", "#ffffff"), Color.WHITE);
            muted = (txt & 0x00ffffff) | 0xa6000000;
            bg0 = col(th.optString("bg0", "#020307"), 0xff020307);
            bg1 = col(th.optString("bg1", "#0b1020"), 0xff0b1020);
            hot = col(th.optString("hot", "#fff3dc"), 0xfffff3dc);
            rad = (float) sp.optDouble("radius", 26);
        }

        float dp(float v) { return v * s; }

        RemoteViews build() {
            String layout = sp.optString("layout", "orb");
            String L; int res;
            switch (layout) {
                case "orb": L = hDp < 96 ? "orb_slim" : "orb"; break;
                case "center": L = Math.min(wDp, hDp) < 132 ? "center_sm" : "center"; break;
                case "grid": L = "grid"; break;
                case "flip": L = "flip"; break;
                default: L = "plain";
            }
            res = c.getResources().getIdentifier("vv_hw_" + L, "layout", c.getPackageName());
            RemoteViews v = new RemoteViews(c.getPackageName(), res);

            Bitmap b = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
            Canvas cv = new Canvas(b);
            background(cv);
            boolean rings = !"off".equals(sp.optString("rings", "on"));
            boolean stars = !"off".equals(sp.optString("stars", "on"));
            String orb = sp.optString("orb", "hole");

            switch (L) {
                case "orb": case "orb_slim": {
                    boolean slim = L.equals("orb_slim");
                    float box = slim ? SLIM_BOX : ORB_BOX, m = slim ? SLIM_M : ORB_M;
                    float cx = dp(m + box / 2), cy = H / 2f, R = dp(box / 2);
                    drawOrb(cv, cx, cy, R, orb);
                    textBlock(cv, dp(m + box + (slim ? 8 : 10)), W - dp(14), slim);
                    break;
                }
                case "center": case "center_sm": {
                    float box = L.equals("center") ? CENTER_BOX : CENTER_SM;
                    float cx = W / 2f, cy = H / 2f, R = dp(box / 2);
                    drawOrb(cv, cx, cy, R, orb);
                    centerText(cv, cx, cy, R);
                    boolean clock = sp.optBoolean("clock", false);
                    v.setViewVisibility(id("vv_clock"), clock ? View.VISIBLE : View.GONE);
                    if (clock) v.setTextColor(id("vv_clock"), txt);
                    break;
                }
                case "grid": grid(cv, v); break;
                case "flip": flip(v); break;
                default:
                    if ("week".equals(sp.optString("chart")) || "cats".equals(sp.optString("chart"))) chart(cv);
                    else minimal(cv);
            }
            v.setImageViewBitmap(id("vv_bg"), b);

            // motion layers
            int ring1 = id("vv_ring1"), ring2 = id("vv_ring2"), pulse = id("vv_pulse"), tw = id("vv_twinkle");
            if (ring1 != 0) v.setViewVisibility(ring1, rings ? View.VISIBLE : View.GONE);
            if (ring2 != 0) v.setViewVisibility(ring2, rings ? View.VISIBLE : View.GONE);
            if (pulse != 0) v.setViewVisibility(pulse, "none".equals(orb) ? View.GONE : View.VISIBLE);
            if (tw != 0) v.setViewVisibility(tw, stars ? View.VISIBLE : View.GONE);
            if (Build.VERSION.SDK_INT >= 31) {
                try {
                    if (ring1 != 0) v.setColorStateList(ring1, "setIndeterminateTintList", ColorStateList.valueOf(a1));
                    if (ring2 != 0) v.setColorStateList(ring2, "setIndeterminateTintList", ColorStateList.valueOf(a2));
                    if (pulse != 0) v.setColorStateList(pulse, "setIndeterminateTintList", ColorStateList.valueOf(a1));
                } catch (Throwable ignored) {}
            }
            v.setOnClickPendingIntent(id("vv_root"), act(sp.optString("tap", "vedverse://home"), null, 0));
            return v;
        }

        int id(String n) { return c.getResources().getIdentifier(n, "id", c.getPackageName()); }

        /* ---------------- background */
        void background(Canvas cv) {
            String style = sp.optString("bg", "void");
            RectF r = new RectF(0, 0, W, H); float rr = dp(rad);
            Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
            switch (style) {
                case "solid": p.setColor(col(sp.optString("bgColor", ""), bg1)); cv.drawRoundRect(r, rr, rr, p); break;
                case "glass":
                    p.setShader(new LinearGradient(0, 0, W, H, new int[]{ blend(bg1, a1, .45f), bg1, blend(bg1, a2, .3f) }, null, Shader.TileMode.CLAMP));
                    cv.drawRoundRect(r, rr, rr, p);
                    glow(cv, W * .88f, H * .05f, Math.max(W, H) * .6f, a2, 0x66);
                    glow(cv, W * .05f, H, Math.max(W, H) * .55f, a1, 0x55);
                    Paint hi = new Paint(Paint.ANTI_ALIAS_FLAG);
                    hi.setShader(new LinearGradient(0, 0, 0, H * .5f, 0x2affffff, 0, Shader.TileMode.CLAMP));
                    cv.drawRoundRect(new RectF(0, 0, W, H * .5f), rr, rr, hi);
                    break;
                case "nebula":
                    p.setShader(new LinearGradient(0, 0, 0, H, bg1, bg0, Shader.TileMode.CLAMP));
                    cv.drawRoundRect(r, rr, rr, p);
                    cv.save(); clip(cv, r, rr);
                    glow(cv, W * .2f, H * .2f, Math.max(W, H) * .55f, a2, 0x40);
                    glow(cv, W * .85f, H * .9f, Math.max(W, H) * .6f, a1, 0x55);
                    glow(cv, W * .6f, H * .35f, Math.max(W, H) * .35f, 0xffff6a8a, 0x22);
                    cv.restore();
                    break;
                case "aurora":
                    p.setShader(new LinearGradient(0, 0, 0, H, bg0, bg1, Shader.TileMode.CLAMP));
                    cv.drawRoundRect(r, rr, rr, p);
                    cv.save(); clip(cv, r, rr);
                    Paint band = new Paint(Paint.ANTI_ALIAS_FLAG);
                    band.setShader(new LinearGradient(0, H * .15f, W, H * .7f, new int[]{ 0, (a2 & 0xffffff) | 0x55000000, (a1 & 0xffffff) | 0x44000000, 0 }, null, Shader.TileMode.CLAMP));
                    Path wave = new Path(); wave.moveTo(0, H * .55f);
                    wave.cubicTo(W * .3f, H * .15f, W * .6f, H * .75f, W, H * .3f); wave.lineTo(W, H * .55f);
                    wave.cubicTo(W * .6f, H * .95f, W * .3f, H * .4f, 0, H * .8f); wave.close();
                    cv.drawPath(wave, band);
                    cv.restore();
                    break;
                default: // void: deep space
                    p.setShader(new RadialGradient(W * .3f, H * .2f, Math.max(W, H), new int[]{ bg1, bg0 }, null, Shader.TileMode.CLAMP));
                    cv.drawRoundRect(r, rr, rr, p);
                    cv.save(); clip(cv, r, rr);
                    glow(cv, W * .1f, H * 1.05f, Math.max(W, H) * .6f, a1, 0x30);
                    cv.restore();
            }
            // your own photo as the background (picked in Widget Studio, stored as a small JPEG)
            String img = sp.optString("bgImg", "");
            if (!img.isEmpty()) {
                try {
                    byte[] raw = android.util.Base64.decode(img.substring(img.indexOf(',') + 1), android.util.Base64.DEFAULT);
                    Bitmap ph = android.graphics.BitmapFactory.decodeByteArray(raw, 0, raw.length);
                    if (ph != null) {
                        cv.save(); clip(cv, r, rr);
                        float sc = Math.max(W / (float) ph.getWidth(), H / (float) ph.getHeight());
                        float dw = ph.getWidth() * sc, dh = ph.getHeight() * sc;
                        Paint bp = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
                        cv.drawBitmap(ph, null, new RectF((W - dw) / 2, (H - dh) / 2, (W + dw) / 2, (H + dh) / 2), bp);
                        Paint dim = new Paint(); dim.setColor((int) (Math.max(0, Math.min(1, sp.optDouble("bgDim", 0.35))) * 255) << 24);
                        cv.drawRect(r, dim);
                        cv.restore();
                    }
                } catch (Exception ignored) {}
            }
            if (!"off".equals(sp.optString("stars", "on"))) {
                cv.save(); clip(cv, r, rr);
                Random rnd = new Random(key.hashCode() * 31L + 7);
                Paint st = new Paint(Paint.ANTI_ALIAS_FLAG);
                int n = (int) (W * H / (dp(14) * dp(14)) * .35f);
                for (int i = 0; i < n; i++) {
                    float x = rnd.nextFloat() * W, y = rnd.nextFloat() * H, sz = dp(.35f + rnd.nextFloat() * .8f);
                    st.setColor(Color.argb(60 + rnd.nextInt(150), 255, 240 + rnd.nextInt(15), 225 + rnd.nextInt(30)));
                    cv.drawCircle(x, y, sz, st);
                }
                cv.restore();
            }
            Paint e = new Paint(Paint.ANTI_ALIAS_FLAG); e.setStyle(Paint.Style.STROKE); e.setStrokeWidth(dp(1));
            e.setShader(new LinearGradient(0, 0, W, H, new int[]{ 0x55ffffff, 0x0effffff, 0x33ffffff }, null, Shader.TileMode.CLAMP));
            cv.drawRoundRect(new RectF(dp(.5f), dp(.5f), W - dp(.5f), H - dp(.5f)), rr, rr, e);
        }

        void clip(Canvas cv, RectF r, float rr) { Path p = new Path(); p.addRoundRect(r, rr, rr, Path.Direction.CW); cv.clipPath(p); }

        void glow(Canvas cv, float x, float y, float r, int color, int alpha) {
            Paint g = new Paint(Paint.ANTI_ALIAS_FLAG);
            g.setShader(new RadialGradient(x, y, r, new int[]{ (color & 0xffffff) | (alpha << 24), 0 }, null, Shader.TileMode.CLAMP));
            cv.drawCircle(x, y, r, g);
        }

        /* ---------------- black hole orb */
        void drawOrb(Canvas cv, float cx, float cy, float R, String orb) {
            if ("none".equals(orb)) return;
            double health = d.optJSONObject("n") != null ? d.optJSONObject("n").optDouble("health", 1) : 1;
            int disk = blend(0xffff4a2a, a1, (float) Math.max(0, Math.min(1, health)));
            glow(cv, cx, cy, R * 1.05f, disk, 0x55);
            if ("glow".equals(orb)) { glow(cv, cx, cy, R * .55f, hot, 0x66); return; }
            float rs = R * .3f;
            // accretion disk (far half), seen nearly edge-on and tilted
            cv.save(); cv.rotate(-12, cx, cy);
            Paint dk = new Paint(Paint.ANTI_ALIAS_FLAG);
            dk.setShader(new LinearGradient(cx - R * .95f, cy, cx + R * .95f, cy, new int[]{ 0, (disk & 0xffffff) | 0xcc000000, hot, (disk & 0xffffff) | 0xff000000, 0 }, new float[]{ 0, .25f, .62f, .8f, 1 }, Shader.TileMode.CLAMP));
            RectF ell = new RectF(cx - R * .95f, cy - R * .13f, cx + R * .95f, cy + R * .13f);
            cv.drawOval(ell, dk);
            // lensed image of the far side, bent over the top of the hole
            Paint arc = new Paint(Paint.ANTI_ALIAS_FLAG); arc.setStyle(Paint.Style.STROKE); arc.setStrokeWidth(rs * .42f);
            arc.setShader(new LinearGradient(cx - rs * 1.5f, cy, cx + rs * 1.5f, cy, new int[]{ (disk & 0xffffff) | 0x99000000, hot, (disk & 0xffffff) | 0xdd000000 }, null, Shader.TileMode.CLAMP));
            cv.drawArc(new RectF(cx - rs * 1.42f, cy - rs * 1.42f, cx + rs * 1.42f, cy + rs * 1.42f), 180, 180, false, arc);
            arc.setStrokeWidth(rs * .2f); arc.setAlpha(150);
            cv.drawArc(new RectF(cx - rs * 1.3f, cy - rs * 1.3f, cx + rs * 1.3f, cy + rs * 1.3f), 0, 180, false, arc);
            // shadow + photon ring
            Paint sh = new Paint(Paint.ANTI_ALIAS_FLAG); sh.setColor(0xff000000);
            cv.drawCircle(cx, cy, rs, sh);
            Paint pr = new Paint(Paint.ANTI_ALIAS_FLAG); pr.setStyle(Paint.Style.STROKE); pr.setStrokeWidth(Math.max(1f, dp(1.1f))); pr.setColor((hot & 0xffffff) | 0xe6000000);
            cv.drawCircle(cx, cy, rs * 1.04f, pr);
            // near half of the disk crosses in front of the shadow
            cv.save(); cv.clipRect(cx - R, cy, cx + R, cy + R);
            cv.drawOval(ell, dk);
            cv.restore();
            cv.restore();
        }

        /* ---------------- text */
        TextPaint tp(float sizeSp, Typeface tf, int color) {
            TextPaint t = new TextPaint(Paint.ANTI_ALIAS_FLAG); t.setTextSize(dp(sizeSp)); t.setTypeface(tf); t.setColor(color); return t;
        }
        void text(Canvas cv, String s, float x, float y, float maxW, TextPaint t) {
            if (s == null || s.isEmpty()) return;
            cv.drawText(TextUtils.ellipsize(s, t, Math.max(1, maxW), TextUtils.TruncateAt.END).toString(), x, y, t);
        }
        String tpl(String key) { return fill(sp.optString(key, "")); }
        String fill(String t) {
            if (t == null || t.indexOf('{') < 0) return t;
            Matcher m = Pattern.compile("\\{([a-zA-Z0-9_]+)\\}").matcher(t); StringBuffer sb = new StringBuffer();
            while (m.find()) m.appendReplacement(sb, Matcher.quoteReplacement(f.optString(m.group(1), "")));
            m.appendTail(sb); return sb.toString();
        }
        int barVal(JSONObject o) {
            String k = o.optString("bar", "");
            if (k.isEmpty()) return -1;
            JSONObject n = d.optJSONObject("n");
            return n == null ? -1 : (int) Math.max(0, Math.min(100, n.optDouble(k, -1)));
        }
        void bar(Canvas cv, float x, float y, float w, int pct) {
            float h = dp(5); Paint p = new Paint(Paint.ANTI_ALIAS_FLAG); p.setColor(0x26ffffff);
            cv.drawRoundRect(new RectF(x, y, x + w, y + h), h, h, p);
            if (pct <= 0) return;
            p.setShader(new LinearGradient(x, 0, x + w, 0, a2, a1, Shader.TileMode.CLAMP));
            cv.drawRoundRect(new RectF(x, y, x + Math.max(h, w * pct / 100f), y + h), h, h, p);
        }

        void textBlock(Canvas cv, float x, float right, boolean slim) {
            float w = right - x;
            TextPaint title = tp(slim ? 9.5f : 10.5f, med, muted); title.setLetterSpacing(.12f);
            TextPaint big = tp(slim ? 19 : 25, bold, txt);
            TextPaint sub = tp(slim ? 10.5f : 11.5f, reg, muted);
            int pct = barVal(sp);
            float blockH = (slim ? 10 + 22 + 13 : 12 + 30 + (pct >= 0 ? 13 : 0) + 15);
            float y = (H - dp(blockH)) / 2f;
            y += dp(slim ? 9 : 11); text(cv, tpl("title").toUpperCase(), x, y, w, title);
            y += dp(slim ? 22 : 29); fit(big, tpl("big"), w, slim ? 13 : 16); text(cv, tpl("big"), x, y, w, big);
            if (pct >= 0 && !slim) { y += dp(8); bar(cv, x, y, w, pct); y += dp(5); }
            y += dp(slim ? 14 : 16); text(cv, tpl("sub"), x, y, w, sub);
        }
        void fit(TextPaint t, String s, float w, float minSp) {
            while (s != null && t.measureText(s) > w && t.getTextSize() > dp(minSp)) t.setTextSize(t.getTextSize() - dp(1));
        }

        void centerText(Canvas cv, float cx, float cy, float R) {
            TextPaint title = tp(9.5f, med, muted); title.setLetterSpacing(.12f); title.setTextAlign(Paint.Align.CENTER);
            TextPaint ctr = tp(R > dp(50) ? 15 : 12, bold, Color.WHITE); ctr.setTextAlign(Paint.Align.CENTER);
            TextPaint big = tp(22, bold, txt); big.setTextAlign(Paint.Align.CENTER);
            TextPaint sub = tp(10.5f, reg, muted); sub.setTextAlign(Paint.Align.CENTER);
            float top = cy - R, bot = cy + R;
            if (top > dp(14)) text(cv, tpl("title").toUpperCase(), cx, Math.max(dp(16), top - dp(6)), W - dp(20), title);
            else text(cv, tpl("title").toUpperCase(), cx, dp(15), W - dp(20), title);
            if (!sp.optBoolean("clock", false)) { String ct = tpl("center"); fit(ctr, ct, R * .62f, 8); text(cv, ct, cx, cy + ctr.getTextSize() * .35f, R * .7f, ctr); }
            float room = H - bot;
            if (room > dp(46)) {
                fit(big, tpl("big"), W - dp(24), 14);
                text(cv, tpl("big"), cx, bot + dp(26), W - dp(24), big);
                int pct = barVal(sp); float yy = bot + dp(34);
                if (pct >= 0 && room > dp(62)) { bar(cv, W * .2f, yy, W * .6f, pct); yy += dp(8); }
                text(cv, tpl("sub"), cx, yy + dp(12), W - dp(24), sub);
            } else text(cv, tpl("sub"), cx, H - dp(10), W - dp(20), sub);
        }

        void minimal(Canvas cv) {
            float x = dp(16), w = W - dp(32);
            TextPaint title = tp(10, med, muted); title.setLetterSpacing(.14f);
            TextPaint big = tp(Math.min(30, hDp * .36f), bold, txt);
            TextPaint sub = tp(11, reg, muted);
            fit(big, tpl("big"), w, 14);
            float y = H / 2f - dp(4);
            text(cv, tpl("title").toUpperCase(), x, y - big.getTextSize() * .9f, w, title);
            text(cv, tpl("big"), x, y + big.getTextSize() * .3f, w, big);
            text(cv, tpl("sub"), x, y + big.getTextSize() * .3f + dp(16), w, sub);
        }

        /* ---------------- grid of actions */
        void grid(Canvas cv, RemoteViews v) {
            JSONArray acts = sp.optJSONArray("actions");
            boolean two = hDp >= 100;
            boolean head = two;
            v.setViewVisibility(id("vv_row2"), two ? View.VISIBLE : View.GONE);
            v.setViewVisibility(id("vv_head"), head ? View.VISIBLE : View.GONE);
            if (head) {
                TextPaint title = tp(10.5f, med, muted); title.setLetterSpacing(.12f);
                text(cv, tpl("title").toUpperCase(), dp(GRID_PAD + 6), dp(GRID_PAD + 17), W - dp(60), title);
            }
            float top = dp(GRID_PAD + (head ? GRID_HEAD : 0)), left = dp(GRID_PAD);
            float cw = (W - dp(GRID_PAD * 2)) / 4f, ch = (H - top - dp(GRID_PAD)) / (two ? 2f : 1f);
            for (int i = 0; i < 8; i++) {
                int cell = id("vv_a" + (i + 1));
                JSONObject a = acts != null ? acts.optJSONObject(i) : null;
                if (i >= (two ? 8 : 4)) continue;
                if (a == null) { v.setOnClickPendingIntent(cell, act(sp.optString("tap", "vedverse://home"), null, 20 + i)); continue; }
                int row = i / 4, colI = i % 4;
                RectF r = new RectF(left + colI * cw + dp(CELL_M), top + row * ch + dp(CELL_M), left + (colI + 1) * cw - dp(CELL_M), top + (row + 1) * ch - dp(CELL_M));
                tile(cv, r, a);
                v.setOnClickPendingIntent(cell, act(a.optString("url", ""), a.optString("app", null), 20 + i));
            }
        }

        void tile(Canvas cv, RectF r, JSONObject a) {
            float rr = Math.min(dp(16), r.height() / 3);
            Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
            p.setShader(new LinearGradient(r.left, r.top, r.right, r.bottom, 0x24ffffff, 0x0cffffff, Shader.TileMode.CLAMP));
            cv.drawRoundRect(r, rr, rr, p);
            Paint e = new Paint(Paint.ANTI_ALIAS_FLAG); e.setStyle(Paint.Style.STROKE); e.setStrokeWidth(dp(.8f)); e.setColor(0x26ffffff);
            cv.drawRoundRect(r, rr, rr, e);
            String icon = a.optString("icon", "text"), label = fill(a.optString("label", ""));
            boolean small = r.height() < dp(52);
            float gs = Math.min(r.width(), r.height()) * (small ? .42f : .36f);
            float gx = r.centerX(), gy = small ? r.centerY() : r.top + r.height() * .42f;
            TextPaint lp = tp(small ? 0 : 9.5f, med, muted); lp.setTextAlign(Paint.Align.CENTER);
            switch (icon) {
                case "text": {
                    TextPaint t = tp(small ? 13 : 15, bold, txt); t.setTextAlign(Paint.Align.CENTER);
                    fit(t, label, r.width() - dp(8), 9);
                    text(cv, label, gx, r.centerY() + t.getTextSize() * .35f - (small ? 0 : dp(4)), r.width() - dp(6), t);
                    String sub = fill(a.optString("sub", ""));
                    if (!small && !sub.isEmpty()) text(cv, sub, gx, r.bottom - dp(8), r.width() - dp(6), lp);
                    return;
                }
                case "user": {
                    Paint u = new Paint(Paint.ANTI_ALIAS_FLAG);
                    u.setShader(new LinearGradient(gx - gs, gy - gs, gx + gs, gy + gs, a2, a1, Shader.TileMode.CLAMP));
                    cv.drawCircle(gx, gy, gs * .62f, u);
                    TextPaint t = tp(0, bold, 0xff120c03); t.setTextSize(gs * .7f); t.setTextAlign(Paint.Align.CENTER);
                    String ini = label.isEmpty() ? "?" : label.substring(0, 1).toUpperCase();
                    cv.drawText(ini, gx, gy + t.getTextSize() * .36f, t);
                    break;
                }
                case "app": {
                    try {
                        Drawable dr = c.getPackageManager().getApplicationIcon(a.optString("app"));
                        int z = (int) (gs * 1.3f);
                        dr.setBounds((int) (gx - z / 2f), (int) (gy - z / 2f), (int) (gx + z / 2f), (int) (gy + z / 2f));
                        dr.draw(cv);
                    } catch (Exception ex) { glyph(cv, "bolt", gx, gy, gs); }
                    break;
                }
                default: glyph(cv, icon, gx, gy, gs);
            }
            if (!small) text(cv, label, gx, r.bottom - dp(8), r.width() - dp(6), lp);
        }

        // tiny line-icon set drawn with strokes, sized to box s around (x, y)
        void glyph(Canvas cv, String g, float x, float y, float s) {
            Paint p = new Paint(Paint.ANTI_ALIAS_FLAG); p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(Math.max(1.5f, s * .1f));
            p.setStrokeCap(Paint.Cap.ROUND); p.setStrokeJoin(Paint.Join.ROUND); p.setColor(txt);
            float h = s / 2;
            Path pa = new Path();
            switch (g) {
                case "scan":
                    float k = h * .45f;
                    pa.moveTo(x - h, y - h + k); pa.lineTo(x - h, y - h); pa.lineTo(x - h + k, y - h);
                    pa.moveTo(x + h - k, y - h); pa.lineTo(x + h, y - h); pa.lineTo(x + h, y - h + k);
                    pa.moveTo(x + h, y + h - k); pa.lineTo(x + h, y + h); pa.lineTo(x + h - k, y + h);
                    pa.moveTo(x - h + k, y + h); pa.lineTo(x - h, y + h); pa.lineTo(x - h, y + h - k);
                    cv.drawPath(pa, p); p.setColor(a1); cv.drawLine(x - h * .6f, y, x + h * .6f, y, p); return;
                case "history": cv.drawCircle(x, y, h, p); cv.drawLine(x, y, x, y - h * .55f, p); cv.drawLine(x, y, x + h * .4f, y + h * .25f, p); return;
                case "stats": for (int i = 0; i < 3; i++) { float bx = x - h * .6f + i * h * .6f, bh = h * (.6f + i * .45f); cv.drawLine(bx, y + h, bx, y + h - bh * 1.3f, p); } return;
                case "bolt": pa.moveTo(x + h * .15f, y - h); pa.lineTo(x - h * .5f, y + h * .1f); pa.lineTo(x + h * .05f, y + h * .1f); pa.lineTo(x - h * .15f, y + h); pa.lineTo(x + h * .5f, y - h * .1f); pa.lineTo(x - h * .05f, y - h * .1f); pa.close(); cv.drawPath(pa, p); return;
                case "keypad": { Paint q = new Paint(Paint.ANTI_ALIAS_FLAG); q.setColor(txt); for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) cv.drawCircle(x + i * h * .65f, y + j * h * .65f, h * .13f, q); return; }
                case "home": pa.moveTo(x - h, y - h * .05f); pa.lineTo(x, y - h); pa.lineTo(x + h, y - h * .05f); pa.moveTo(x - h * .7f, y - h * .3f); pa.lineTo(x - h * .7f, y + h); pa.lineTo(x + h * .7f, y + h); pa.lineTo(x + h * .7f, y - h * .3f); cv.drawPath(pa, p); return;
                case "gear": cv.drawCircle(x, y, h * .38f, p); for (int i = 0; i < 8; i++) { double a = i * Math.PI / 4; cv.drawLine(x + (float) Math.cos(a) * h * .62f, y + (float) Math.sin(a) * h * .62f, x + (float) Math.cos(a) * h, y + (float) Math.sin(a) * h, p); } return;
                case "star": for (int i = 0; i < 5; i++) { double a = -Math.PI / 2 + i * 4 * Math.PI / 5; float px = x + (float) Math.cos(a) * h, py = y + (float) Math.sin(a) * h; if (i == 0) pa.moveTo(px, py); else pa.lineTo(px, py); } pa.close(); cv.drawPath(pa, p); return;
                case "plus": cv.drawLine(x - h, y, x + h, y, p); cv.drawLine(x, y - h, x, y + h, p); return;
                case "paste": cv.drawRoundRect(new RectF(x - h * .75f, y - h * .8f, x + h * .75f, y + h), h * .2f, h * .2f, p); cv.drawLine(x - h * .3f, y - h, x + h * .3f, y - h, p); return;
                case "image": cv.drawRoundRect(new RectF(x - h, y - h * .8f, x + h, y + h * .8f), h * .2f, h * .2f, p); pa.moveTo(x - h * .8f, y + h * .6f); pa.lineTo(x - h * .2f, y); pa.lineTo(x + h * .2f, y + h * .35f); pa.lineTo(x + h * .5f, y + h * .1f); pa.lineTo(x + h * .8f, y + h * .6f); cv.drawPath(pa, p); return;
                case "studio": for (int i = 0; i < 2; i++) for (int j = 0; j < 2; j++) cv.drawRoundRect(new RectF(x - h + i * h * 1.1f, y - h + j * h * 1.1f, x - h + i * h * 1.1f + h * .9f, y - h + j * h * 1.1f + h * .9f), h * .2f, h * .2f, p); return;
                case "orbit": cv.drawCircle(x, y, h * .3f, p); cv.save(); cv.rotate(-20, x, y); cv.drawOval(new RectF(x - h, y - h * .4f, x + h, y + h * .4f), p); cv.restore(); return;
                default: cv.drawCircle(x, y, h * .7f, p);
            }
        }

        /* ---------------- flip cards (ViewFlipper slides between pages) */
        void flip(RemoteViews v) {
            JSONArray pages = sp.optJSONArray("pages");
            int n = pages != null ? Math.max(1, pages.length()) : 1;
            for (int i = 0; i < 3; i++) {
                JSONObject pg = pages != null ? pages.optJSONObject(i % n) : sp;
                if (pg == null) pg = sp;
                Bitmap b = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
                Canvas cv = new Canvas(b);
                float x = dp(18), w = W - dp(60);
                TextPaint title = tp(10.5f, med, muted); title.setLetterSpacing(.12f);
                TextPaint big = tp(Math.min(30, hDp * .26f), bold, txt);
                TextPaint sub = tp(11.5f, reg, muted);
                String bt = fill(pg.optString("big", "")); fit(big, bt, W - dp(36), 14);
                int pct = barVal(pg);
                float y = H / 2f - dp(18);
                text(cv, fill(pg.optString("title", "")).toUpperCase(), x, y - dp(4), w, title);
                y += big.getTextSize() + dp(2); text(cv, bt, x, y, W - dp(36), big);
                if (pct >= 0) { y += dp(9); bar(cv, x, y, W - dp(36), pct); y += dp(4); }
                y += dp(17); text(cv, fill(pg.optString("sub", "")), x, y, W - dp(36), sub);
                // page dots
                Paint dot = new Paint(Paint.ANTI_ALIAS_FLAG);
                for (int k = 0; k < 3; k++) { dot.setColor(k == i ? a1 : 0x40ffffff); cv.drawCircle(W - dp(16) - (2 - k) * dp(9), H - dp(13), dp(k == i ? 3 : 2.4f), dot); }
                v.setImageViewBitmap(id("vv_p" + (i + 1)), b);
            }
        }

        /* ---------------- charts */
        void chart(Canvas cv) {
            float x = dp(16), w = W - dp(32);
            TextPaint title = tp(10.5f, med, muted); title.setLetterSpacing(.12f);
            TextPaint big = tp(18, bold, txt);
            text(cv, tpl("title").toUpperCase(), x, dp(22), w - dp(30), title);
            text(cv, tpl("big"), x, dp(44), w, big);
            float top = dp(54), bottom = H - dp(22);
            TextPaint lab = tp(9, med, muted); lab.setTextAlign(Paint.Align.CENTER);
            if ("week".equals(sp.optString("chart"))) {
                JSONArray wk = d.optJSONArray("week"); if (wk == null) return;
                double max = 1; for (int i = 0; i < wk.length(); i++) max = Math.max(max, wk.optJSONObject(i).optDouble("v", 0));
                float bw = w / Math.max(1, wk.length());
                for (int i = 0; i < wk.length(); i++) {
                    JSONObject o = wk.optJSONObject(i);
                    float hh = (float) (o.optDouble("v", 0) / max) * (bottom - top - dp(6));
                    float bx = x + i * bw + bw * .22f, bx2 = x + (i + 1) * bw - bw * .22f;
                    Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
                    boolean today = i == wk.length() - 1;
                    p.setShader(new LinearGradient(0, bottom - hh, 0, bottom, today ? hot : a1, (a1 & 0xffffff) | 0x40000000, Shader.TileMode.CLAMP));
                    cv.drawRoundRect(new RectF(bx, bottom - Math.max(dp(3), hh), bx2, bottom), dp(4), dp(4), p);
                    text(cv, o.optString("l", ""), (bx + bx2) / 2, H - dp(9), bw, lab);
                }
            } else {
                JSONArray cs = d.optJSONArray("cats"); if (cs == null) return;
                int n = Math.min(4, cs.length()); if (n == 0) return;
                double max = 1; for (int i = 0; i < n; i++) max = Math.max(max, cs.optJSONObject(i).optDouble("v", 0));
                float rowH = (H - top - dp(10)) / n;
                TextPaint name = tp(10.5f, med, txt), amt = tp(10.5f, med, muted); amt.setTextAlign(Paint.Align.RIGHT);
                for (int i = 0; i < n; i++) {
                    JSONObject o = cs.optJSONObject(i);
                    float yy = top + i * rowH + rowH * .5f;
                    text(cv, o.optString("l", ""), x, yy, w * .3f, name);
                    text(cv, o.optString("t", ""), x + w, yy, w * .25f, amt);
                    float bx = x + w * .32f, bw = w * .4f * (float) (o.optDouble("v", 0) / max);
                    Paint p = new Paint(Paint.ANTI_ALIAS_FLAG); p.setColor(col(o.optString("c", ""), a1));
                    cv.drawRoundRect(new RectF(bx, yy - dp(6), bx + Math.max(dp(4), bw), yy - dp(1)), dp(3), dp(3), p);
                }
            }
        }

        /* ---------------- taps */
        PendingIntent act(String url, String app, int slot) {
            int rc = id * 32 + slot;
            Intent i = null;
            if (app != null && !app.isEmpty()) i = c.getPackageManager().getLaunchIntentForPackage(app);
            if (i == null) {
                if (url == null || url.isEmpty()) url = "vedverse://home";
                i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                if (url.startsWith("vedverse:") || url.startsWith("upi:")) i.setPackage(c.getPackageName());
            }
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            return PendingIntent.getActivity(c, rc, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        }
    }

    /* --------------------------------------------------------------- helpers */
    static int col(String hex, int def) { try { return hex == null || hex.isEmpty() ? def : Color.parseColor(hex); } catch (Exception e) { return def; } }
    static int blend(int a, int b, float t) {
        return Color.argb((int) (Color.alpha(a) + (Color.alpha(b) - Color.alpha(a)) * t), (int) (Color.red(a) + (Color.red(b) - Color.red(a)) * t),
                (int) (Color.green(a) + (Color.green(b) - Color.green(a)) * t), (int) (Color.blue(a) + (Color.blue(b) - Color.blue(a)) * t));
    }
}
