#!/usr/bin/env python3
"""Generates the Android resources for Vedverse's home-screen widget engine (native/android/res).
Layouts must keep the dp geometry in sync with VedWidgets.java (ORB_BOX, CENTER_BOX, GRID_* ...).
Run: python scripts/make-widget-res.py"""
import os, random
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
RES = os.path.join(ROOT, 'native', 'android', 'res')
A = 'xmlns:android="http://schemas.android.com/apk/res/android"'


def w(rel, s):
    p = os.path.join(RES, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf8').write('<?xml version="1.0" encoding="utf-8"?>\n' + s.strip() + '\n')


# ---------------------------------------------------------------- motion drawables
w('drawable/vv_ring_a.xml', f'''<vector {A} android:width="100dp" android:height="100dp" android:viewportWidth="100" android:viewportHeight="100">
  <path android:pathData="M50,4 A46,46 0 0,1 89.84,73" android:strokeColor="#FFFFFFFF" android:strokeAlpha="0.9" android:strokeWidth="1.7" android:strokeLineCap="round"/>
  <path android:pathData="M65.73,93.23 A46,46 0 0,1 14.76,79.57" android:strokeColor="#FFFFFFFF" android:strokeAlpha="0.55" android:strokeWidth="1.2" android:strokeLineCap="round"/>
  <path android:pathData="M6.77,34.27 A46,46 0 0,1 34.27,6.77" android:strokeColor="#FFFFFFFF" android:strokeAlpha="0.35" android:strokeWidth="0.9" android:strokeLineCap="round"/>
  <path android:pathData="M86.84,73 a3,3 0 1,0 6,0 a3,3 0 1,0 -6,0" android:fillColor="#FFFFFFFF"/>
  <path android:pathData="M5.17,65.73 a1.6,1.6 0 1,0 3.2,0 a1.6,1.6 0 1,0 -3.2,0" android:fillColor="#FFFFFFFF" android:fillAlpha="0.8"/>
</vector>''')
w('drawable/vv_ring_b.xml', f'''<vector {A} android:width="100dp" android:height="100dp" android:viewportWidth="100" android:viewportHeight="100">
  <path android:pathData="M96,50 A46,46 0 0,1 57.99,95.3" android:strokeColor="#FFFFFFFF" android:strokeAlpha="0.7" android:strokeWidth="1.3" android:strokeLineCap="round"/>
  <path android:pathData="M27,89.84 A46,46 0 0,1 4.7,42.01" android:strokeColor="#FFFFFFFF" android:strokeAlpha="0.4" android:strokeWidth="1.0" android:strokeLineCap="round"/>
  <path android:pathData="M20.43,14.76 A46,46 0 0,1 89.84,27" android:strokeColor="#FFFFFFFF" android:strokeAlpha="0.6" android:strokeWidth="1.1" android:strokeLineCap="round"/>
  <path android:pathData="M87.64,27 a2.2,2.2 0 1,0 4.4,0 a2.2,2.2 0 1,0 -4.4,0" android:fillColor="#FFFFFFFF"/>
</vector>''')
w('drawable/vv_rot_a.xml', f'<rotate {A} android:drawable="@drawable/vv_ring_a" android:fromDegrees="0" android:toDegrees="360" android:pivotX="50%" android:pivotY="50%"/>')
w('drawable/vv_rot_b.xml', f'<rotate {A} android:drawable="@drawable/vv_ring_b" android:fromDegrees="360" android:toDegrees="0" android:pivotX="50%" android:pivotY="50%"/>')
w('drawable/vv_glow_oval.xml', f'''<shape {A} android:shape="oval">
  <gradient android:type="radial" android:gradientRadius="50%" android:startColor="#55FFFFFF" android:centerColor="#18FFFFFF" android:endColor="#00FFFFFF"/>
</shape>''')
w('drawable/vv_pulse.xml', f'<scale {A} android:drawable="@drawable/vv_glow_oval" android:scaleWidth="28%" android:scaleHeight="28%" android:scaleGravity="center"/>')
for i in (1, 2, 3):
    w(f'drawable/vv_tw{i}.xml', f'<bitmap {A} android:src="@drawable/vv_star_tile{i}" android:tileMode="repeat" android:antialias="true"/>')
w('drawable/vv_twinkle.xml', f'''<animation-list {A} android:oneshot="false">
  <item android:drawable="@drawable/vv_tw1" android:duration="1100"/>
  <item android:drawable="@drawable/vv_tw2" android:duration="1100"/>
  <item android:drawable="@drawable/vv_tw3" android:duration="1100"/>
</animation-list>''')
w('drawable/vv_cell_ripple.xml', f'''<ripple {A} android:color="#33FFFFFF">
  <item android:id="@android:id/mask"><shape android:shape="rectangle"><corners android:radius="16dp"/><solid android:color="#FFFFFFFF"/></shape></item>
</ripple>''')
w('drawable/vv_hw_bg.xml', f'''<shape {A} android:shape="rectangle">
  <corners android:radius="26dp"/>
  <gradient android:angle="270" android:startColor="#FF0B1020" android:endColor="#FF020307"/>
  <stroke android:width="1dp" android:color="#22FFFFFF"/>
</shape>''')
w('anim/vv_in.xml', f'''<set {A} android:interpolator="@android:anim/decelerate_interpolator" android:duration="650">
  <translate android:fromXDelta="35%" android:toXDelta="0"/>
  <alpha android:fromAlpha="0" android:toAlpha="1"/>
</set>''')
w('anim/vv_out.xml', f'''<set {A} android:interpolator="@android:anim/accelerate_interpolator" android:duration="650">
  <translate android:fromXDelta="0" android:toXDelta="-35%"/>
  <alpha android:fromAlpha="1" android:toAlpha="0"/>
</set>''')

# star tiles for the twinkle overlay: same star field, different brightness per frame → twinkling
rnd = random.Random(9)
stars = [(rnd.uniform(0, 160), rnd.uniform(0, 160), rnd.uniform(0.5, 1.4), rnd.random()) for _ in range(9)]
os.makedirs(os.path.join(RES, 'drawable-nodpi'), exist_ok=True)
for f in range(3):
    S = 4; im = Image.new('RGBA', (160 * S, 160 * S), (0, 0, 0, 0)); dr = ImageDraw.Draw(im)
    for (x, y, r, ph) in stars:
        a = 0.25 + 0.75 * (0.5 + 0.5 * __import__('math').cos((f / 3 + ph) * 6.283))
        rr = r * S * (0.7 + 0.5 * a)
        dr.ellipse((x * S - rr * 2.6, y * S - rr * 2.6, x * S + rr * 2.6, y * S + rr * 2.6), fill=(255, 236, 210, int(40 * a)))
        dr.ellipse((x * S - rr, y * S - rr, x * S + rr, y * S + rr), fill=(255, 248, 235, int(255 * a)))
    im = im.filter(ImageFilter.GaussianBlur(S * 0.35)).resize((160, 160), Image.LANCZOS)
    im.save(os.path.join(RES, 'drawable-nodpi', f'vv_star_tile{f + 1}.png'), optimize=True)

# preview art: the logo
logo = Image.open(os.path.join(ROOT, 'www', 'assets', 'icon-512.png')).convert('RGB').resize((320, 320), Image.LANCZOS)
logo.save(os.path.join(RES, 'drawable-nodpi', 'vv_widget_preview.png'), optimize=True)
fg = Image.open(os.path.join(ROOT, 'assets', 'icon-foreground.png')).resize((256, 256), Image.LANCZOS)
fg.save(os.path.join(RES, 'drawable-nodpi', 'vv_logo_mark.png'), optimize=True)

# ---------------------------------------------------------------- layouts
PB = 'android:indeterminate="true" android:indeterminateOnly="true" android:minWidth="0dp" android:minHeight="0dp" android:maxWidth="600dp" android:maxHeight="600dp"'


def bgtw():
    return f'''<ImageView android:id="@+id/vv_bg" android:layout_width="match_parent" android:layout_height="match_parent" android:scaleType="fitXY" android:contentDescription="@null"/>
  <ProgressBar android:id="@+id/vv_twinkle" android:layout_width="match_parent" android:layout_height="match_parent" android:layout_margin="7dp" {PB} android:indeterminateDrawable="@drawable/vv_twinkle"/>'''


def orbbox(box, gravity, margin=''):
    inner = round(box * 0.78)
    return f'''<FrameLayout android:layout_width="{box}dp" android:layout_height="{box}dp" android:layout_gravity="{gravity}" {margin}>
    <ProgressBar android:id="@+id/vv_pulse" android:layout_width="match_parent" android:layout_height="match_parent" {PB} android:indeterminateDrawable="@drawable/vv_pulse" android:indeterminateDuration="2600" android:indeterminateBehavior="cycle"/>
    <ProgressBar android:id="@+id/vv_ring1" android:layout_width="match_parent" android:layout_height="match_parent" {PB} android:indeterminateDrawable="@drawable/vv_rot_a" android:indeterminateDuration="9000"/>
    <ProgressBar android:id="@+id/vv_ring2" android:layout_width="{inner}dp" android:layout_height="{inner}dp" android:layout_gravity="center" {PB} android:indeterminateDrawable="@drawable/vv_rot_b" android:indeterminateDuration="14000"/>
  </FrameLayout>'''


def root(inner):
    return f'''<FrameLayout {A} android:id="@+id/vv_root" android:layout_width="match_parent" android:layout_height="match_parent">
  {inner}
</FrameLayout>'''


badge = orbbox(26, 'top|end', 'android:layout_marginTop="10dp" android:layout_marginEnd="10dp"')
clock = lambda sp: f'<TextClock android:id="@+id/vv_clock" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_gravity="center" android:format12Hour="h:mm" android:format24Hour="HH:mm" android:textSize="{sp}sp" android:textStyle="bold" android:textColor="#FFFFFFFF" android:shadowColor="#CC000000" android:shadowRadius="8" android:visibility="gone"/>'

w('layout/vv_hw_orb.xml', root(bgtw() + orbbox(92, 'start|center_vertical', 'android:layout_marginStart="10dp"')))
w('layout/vv_hw_orb_slim.xml', root(bgtw() + orbbox(52, 'start|center_vertical', 'android:layout_marginStart="8dp"')))
w('layout/vv_hw_center.xml', root(bgtw() + orbbox(128, 'center') + clock(26)))
w('layout/vv_hw_center_sm.xml', root(bgtw() + orbbox(88, 'center') + clock(19)))
w('layout/vv_hw_plain.xml', root(bgtw() + badge))
w('layout/vv_hw_flip.xml', root(bgtw() + '''
  <ViewFlipper android:id="@+id/vv_flip" android:layout_width="match_parent" android:layout_height="match_parent" android:autoStart="true" android:flipInterval="4500" android:inAnimation="@anim/vv_in" android:outAnimation="@anim/vv_out">
    <ImageView android:id="@+id/vv_p1" android:layout_width="match_parent" android:layout_height="match_parent" android:scaleType="fitXY" android:contentDescription="@null"/>
    <ImageView android:id="@+id/vv_p2" android:layout_width="match_parent" android:layout_height="match_parent" android:scaleType="fitXY" android:contentDescription="@null"/>
    <ImageView android:id="@+id/vv_p3" android:layout_width="match_parent" android:layout_height="match_parent" android:scaleType="fitXY" android:contentDescription="@null"/>
  </ViewFlipper>''' + badge))
cells = lambda a, b: ''.join(f'<FrameLayout android:id="@+id/vv_a{i}" android:layout_width="0dp" android:layout_height="match_parent" android:layout_weight="1" android:layout_margin="3dp" android:background="@drawable/vv_cell_ripple"/>' for i in range(a, b))
w('layout/vv_hw_grid.xml', root(bgtw() + f'''
  <LinearLayout android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="vertical" android:padding="8dp">
    <FrameLayout android:id="@+id/vv_head" android:layout_width="match_parent" android:layout_height="30dp">
      {orbbox(22, 'end|center_vertical', 'android:layout_marginEnd="4dp"')}
    </FrameLayout>
    <LinearLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1" android:orientation="horizontal">{cells(1, 5)}</LinearLayout>
    <LinearLayout android:id="@+id/vv_row2" android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="1" android:orientation="horizontal">{cells(5, 9)}</LinearLayout>
  </LinearLayout>'''))
loading = root(f'''<ImageView android:layout_width="match_parent" android:layout_height="match_parent" android:src="@drawable/vv_hw_bg" android:scaleType="fitXY" android:contentDescription="@null"/>
  <ImageView android:layout_width="56dp" android:layout_height="56dp" android:layout_gravity="center" android:src="@drawable/vv_logo_mark" android:contentDescription="@null"/>
  <ProgressBar android:layout_width="84dp" android:layout_height="84dp" android:layout_gravity="center" {PB} android:indeterminateDrawable="@drawable/vv_rot_a" android:indeterminateDuration="9000"/>''')
w('layout/vv_hw_loading.xml', loading)
w('layout/vv_hw_preview.xml', loading)

# remove the old fixed widget resources (replaced by the engine)
for f in ['layout/vv_widget_stat.xml', 'layout/vv_widget_scan.xml', 'layout/vv_widget_favs.xml', 'drawable/vv_progress.xml'] + [f'xml/vv_widget_{k}.xml' for k in ['budget', 'today', 'safe', 'last', 'scan', 'favs']]:
    p = os.path.join(RES, f)
    if os.path.exists(p): os.remove(p)
print('widget resources generated')
