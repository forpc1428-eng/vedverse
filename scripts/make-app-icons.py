#!/usr/bin/env python3
"""Vedverse — app icon & name packs.
Renders the 36 ray-traced black-hole launcher icons and writes everything the switcher needs:
  native/android/res/drawable-nodpi/vv_ai_NN.png        adaptive-icon foreground (432px, full bleed)
  native/android/res/mipmap-anydpi-v26/vv_ic_NN.xml      adaptive icon (black background + foreground)
  native/android/res/mipmap-xxxhdpi/vv_ic_NN.png         legacy icon for Android 6-7 (rounded, pre-cropped)
  www/assets/appicons/NN.webp                             thumbnails for the in-app picker (00 = classic V logo)
  www/assets/appicons/catalog.json                        icons + names (read by the app AND scripts/patch-android.mjs)
Run: python scripts/make-app-icons.py      (~3 min)"""
import os, sys, json
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('ICON_N', '432')
import bh_icons as B

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
RES = os.path.join(ROOT, 'native', 'android', 'res')
WWW = os.path.join(ROOT, 'www', 'assets', 'appicons')
for d in ['drawable-nodpi', 'mipmap-anydpi-v26', 'mipmap-xxxhdpi', 'values']: os.makedirs(os.path.join(RES, d), exist_ok=True)
os.makedirs(WWW, exist_ok=True)

# launchers show only the centre ~66% of an adaptive icon → widen the view so the whole disk sits in the safe zone
COMPS = [('Edge', 84, -12, 33, 'sky'), ('Tilt', 66, 16, 30, 'stars'), ('Halo', 22, 0, 36, 'sky')]
FOV = 63.0

NAMES = ['Vedverse', 'Vedant', 'Ved', 'VPay', 'Ved Pay', 'Vedant Pay', 'Vedverse Pay', 'Horizon', 'Event Horizon', 'Singularity', 'Gargantua',
         'Black Hole', 'Orbit', 'Quasar', 'Pulsar', 'Eclipse', 'Nebula', 'Cosmos', 'Void', 'Nova', 'Stardust', 'Photon', 'Halo', 'Zenith',
         'Vortex', 'Warp', 'Infinity', 'Spacetime', 'Galaxy Pay', 'Astro Pay', 'Orbit Pay', 'Pay', 'Scan & Pay', 'UPI', 'Wallet', 'My Wallet',
         'Money', 'Paisa', 'Kharcha', 'Hisaab', 'Budget', 'My Money',
         '𝐕𝐞𝐝𝐚𝐧𝐭', '𝓥𝓮𝓭𝓪𝓷𝓽', '𝕍𝕖𝕕𝕒𝕟𝕥', '𝔙𝔢𝔡𝔞𝔫𝔱', '𝗩𝗲𝗱𝗮𝗻𝘁', '𝚅𝚎𝚍𝚊𝚗𝚝', '𝘝𝘦𝘥𝘢𝘯𝘵', 'ᴠᴇᴅᴀɴᴛ', 'Ⓥⓔⓓⓐⓝⓣ',
         '𝐕𝐞𝐝𝐯𝐞𝐫𝐬𝐞', '𝓥𝓮𝓭𝓿𝓮𝓻𝓼𝓮', '𝕍𝕖𝕕𝕧𝕖𝕣𝕤𝕖', '𝔙𝔢𝔡𝔳𝔢𝔯𝔰𝔢', '𝗩𝗲𝗱𝘃𝗲𝗿𝘀𝗲', '𝚅𝚎𝚍𝚟𝚎𝚛𝚜𝚎', '𝘝𝘦𝘥𝘷𝘦𝘳𝘴𝘦', 'ᴠᴇᴅᴠᴇʀsᴇ', 'Ⓥⓔⓓⓥⓔⓡⓢⓔ',
         'V E D A N T', '✦ Vedant ✦', 'Vedant ✨', '⟡ Vedverse']

def rounded(im, r=0.27):
    m = Image.new('L', (im.width * 4, im.height * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, m.width - 1, m.height - 1), radius=int(m.width * r), fill=255)
    m = m.resize(im.size, Image.LANCZOS); out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.paste(im, (0, 0), m); return out

def safe_crop(im):   # what a launcher actually shows of the adaptive icon (centre 72/108)
    w = im.width; c = int(w * 72 / 108); o = (w - c) // 2
    return im.crop((o, o, o + c, o + c))

icons = [{'id': 0, 'name': 'Classic V', 'view': 'Logo'}]
# 00 = the classic V logo thumbnail
Image.open(os.path.join(ROOT, 'www', 'assets', 'icon-512.png')).convert('RGB').resize((144, 144), Image.LANCZOS).save(os.path.join(WWW, '00.webp'), quality=88)
k = 0
for ci, (cname, T, tint, ta) in enumerate(B.COLORS):
    for (view, inc, roll, dist, bg) in COMPS:
        k += 1
        im = B.render(inc, roll, T, tint, ta, sat=0.0 if cname == 'Eclipse Silver' else 1.0, dist=dist, fov=FOV, bg=bg, yaw=ci * 0.7 + 1.1)
        nn = f'{k:02d}'
        im.save(os.path.join(RES, 'drawable-nodpi', f'vv_ai_{nn}.png'), optimize=True)
        open(os.path.join(RES, 'mipmap-anydpi-v26', f'vv_ic_{nn}.xml'), 'w').write(
            '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
            '    <background android:drawable="@color/vv_ai_bg"/>\n'
            f'    <foreground android:drawable="@drawable/vv_ai_{nn}"/>\n</adaptive-icon>\n')
        vis = safe_crop(im)
        rounded(vis.resize((192, 192), Image.LANCZOS)).save(os.path.join(RES, 'mipmap-xxxhdpi', f'vv_ic_{nn}.png'), optimize=True)
        vis.resize((144, 144), Image.LANCZOS).save(os.path.join(WWW, f'{nn}.webp'), quality=88)
        icons.append({'id': k, 'name': cname, 'view': view})
        print(k, cname, view, flush=True)

open(os.path.join(RES, 'values', 'vv_ai_colors.xml'), 'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="vv_ai_bg">#020307</color>\n</resources>\n')
json.dump({'icons': icons, 'names': NAMES, 'default': {'icon': 0, 'name': 0}}, open(os.path.join(WWW, 'catalog.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('done:', len(icons), 'icons,', len(NAMES), 'names →', len(icons) * len(NAMES), 'launcher entries')
