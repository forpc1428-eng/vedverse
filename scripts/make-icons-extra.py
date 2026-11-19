#!/usr/bin/env python3
"""40 unique Vedverse launcher icons (different designs, not colour swaps): cosmic objects, V monograms,
money glyphs and minimal art. Adds them to the icon & name catalog as ids 37..76.
Run after make-app-icons.py:   python scripts/make-icons-extra.py"""
import os, json, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
RES = os.path.join(ROOT, 'native', 'android', 'res'); WWW = os.path.join(ROOT, 'www', 'assets', 'appicons')
S = 432; K = 3; N = S * K          # draw at 3x, downsample → smooth edges
C = N / 2

def font(sz, bold=True):
    for f in (['C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/arialbd.ttf'] if bold else ['C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf']):
        if os.path.exists(f): return ImageFont.truetype(f, int(sz))
    return ImageFont.load_default()
def hexc(h, a=255): h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)
def canvas(): return Image.new('RGBA', (N, N), (0, 0, 0, 0))
def radial(c0, c1, cx=.5, cy=.5, r=.75):
    y, x = np.mgrid[0:N, 0:N] / N; d = np.clip(np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / r, 0, 1)[..., None]
    a, b = np.array(hexc(c0), float), np.array(hexc(c1), float)
    return Image.fromarray((a * (1 - d) + b * d).astype(np.uint8), 'RGBA')
def linear(c0, c1, ang=90):
    y, x = np.mgrid[0:N, 0:N] / N; t = np.clip((x * math.cos(math.radians(ang)) + y * math.sin(math.radians(ang))), 0, 1)[..., None]
    a, b = np.array(hexc(c0), float), np.array(hexc(c1), float)
    return Image.fromarray((a * (1 - t) + b * t).astype(np.uint8), 'RGBA')
def stars(im, n=120, seed=1, col=(255, 245, 230)):
    r = random.Random(seed); d = ImageDraw.Draw(im)
    for _ in range(n):
        x, y, s = r.random() * N, r.random() * N, r.random() ** 3 * 5 * K / 2 + K * .6
        d.ellipse((x - s, y - s, x + s, y + s), fill=col + (int(80 + r.random() * 175),))
    return im
def glow(layer, rad, strength=1.0):
    g = layer.filter(ImageFilter.GaussianBlur(rad * K))
    if strength != 1: g = Image.fromarray(np.clip(np.asarray(g, float) * [1, 1, 1, strength], 0, 255).astype(np.uint8), 'RGBA')
    out = Image.alpha_composite(canvas(), g); return Image.alpha_composite(out, layer)
def over(*ims):
    out = ims[0]
    for im in ims[1:]: out = Image.alpha_composite(out, im)
    return out
def poly(pts): return [(C + x * C, C + y * C) for x, y in pts]
VPTS = [(-.56, -.42), (-.27, -.42), (0, .2), (.27, -.42), (.56, -.42), (0, .52)]
def vmask(scale=1.0, dy=0):
    m = Image.new('L', (N, N), 0); ImageDraw.Draw(m).polygon(poly([(x * scale, y * scale + dy) for x, y in VPTS]), fill=255); return m
def fill_mask(src, mask): out = canvas(); out.paste(src, (0, 0), mask); return out
def ring(d, cx, cy, rx, ry, col, w): d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), outline=col, width=int(w))
def noise(seed, oct=5, scale=3.0):
    rng = np.random.default_rng(seed); acc = np.zeros((N, N)); amp = 1; tot = 0
    for o in range(oct):
        g = int(scale * 2 ** o) + 2; base = rng.random((g, g))
        acc += amp * np.asarray(Image.fromarray((base * 255).astype(np.uint8)).resize((N, N), Image.BICUBIC), float) / 255; tot += amp; amp *= .5
    return acc / tot
def bg_space(c0='#121b36', c1='#020307', n=140, seed=3): return stars(radial(c0, c1, r=.8), n, seed)

ICONS = []
def icon(name, kind):
    def deco(fn): ICONS.append((name, kind, fn)); return fn
    return deco

# ------------------------------------------------------------------ cosmic (14)
@icon('Pulsar', 'Cosmic')
def _():
    im = bg_space('#0d1530', '#02040a'); L = canvas(); d = ImageDraw.Draw(L)
    for s in (1, -1): d.polygon(poly([(0, 0), (s * .9, -.95), (s * .98, -.82)]), fill=(150, 200, 255, 140)); d.polygon(poly([(0, 0), (-s * .9, .95), (-s * .98, .82)]), fill=(150, 200, 255, 140))
    d.ellipse((C - 70, C - 70, C + 70, C + 70), fill=(235, 245, 255, 255)); return glow(over(im, L), 18)
@icon('Spiral Galaxy', 'Cosmic')
def _():
    im = bg_space('#0b0f22', '#010205', 90); L = canvas(); d = ImageDraw.Draw(L); r = random.Random(4)
    for i in range(5200):
        arm = i % 2; t = r.random() * 4; rr = (.05 + t * .2 + r.random() * .06) * C; a = t * 1.6 + arm * math.pi + r.random() * .4
        x, y = C + math.cos(a) * rr, C + math.sin(a) * rr * .62; s = K * (1.2 + r.random() * 1.5)
        d.ellipse((x - s, y - s, x + s, y + s), fill=(255, 220 - int(t * 20), 180 + int(t * 15), int(90 + r.random() * 120)))
    core = canvas(); ImageDraw.Draw(core).ellipse((C - 60, C - 40, C + 60, C + 40), fill=(255, 238, 205, 255))
    return glow(over(im, glow(L, 4, .8), core), 22)
@icon('Ringed Planet', 'Cosmic')
def _():
    im = bg_space('#141b33', '#03040a'); L = canvas(); d = ImageDraw.Draw(L)
    planet = fill_mask(linear('#f6c27a', '#a3542a', 60), (lambda m: (ImageDraw.Draw(m).ellipse((C - 230, C - 230, C + 230, C + 230), fill=255), m)[1])(Image.new('L', (N, N), 0)))
    back = canvas(); bd = ImageDraw.Draw(back); front = canvas(); fd = ImageDraw.Draw(front)
    for i, (rx, w, a) in enumerate([(560, 26, 200), (500, 14, 150), (450, 10, 120)]):
        bd.arc((C - rx, C - rx * .26, C + rx, C + rx * .26), 180, 360, fill=(240, 215, 170, a), width=w); fd.arc((C - rx, C - rx * .26, C + rx, C + rx * .26), 0, 180, fill=(240, 215, 170, a), width=w)
    out = over(im, back.rotate(-18, center=(C, C)), planet, front.rotate(-18, center=(C, C)))
    return out
@icon('Comet', 'Cosmic')
def _():
    im = bg_space('#0c1328', '#02030a', 160); L = canvas(); d = ImageDraw.Draw(L)
    for i in range(60): t = i / 60; d.ellipse((C + 200 - t * 900 - (30 - t * 25) * K / 3, C - 200 + t * 700 - (30 - t * 25) * K / 3, C + 200 - t * 900 + (30 - t * 25) * K / 3, C - 200 + t * 700 + (30 - t * 25) * K / 3), fill=(160, 220, 255, int(140 * (1 - t))))
    d.ellipse((C + 150, C - 250, C + 250, C - 150), fill=(255, 255, 255, 255)); return glow(over(im, L), 20)
@icon('Supernova', 'Cosmic')
def _():
    im = radial('#2a0f0a', '#030104', r=.85); L = canvas(); d = ImageDraw.Draw(L); r = random.Random(7)
    for i in range(160):
        a = r.random() * 6.283; l = (.3 + r.random() * .7) * C; d.line((C, C, C + math.cos(a) * l, C + math.sin(a) * l), fill=(255, 190 + r.randint(0, 60), 120, r.randint(40, 150)), width=K * 2)
    d.ellipse((C - 110, C - 110, C + 110, C + 110), fill=(255, 245, 220, 255)); return glow(over(im, L), 26)
@icon('Wormhole', 'Cosmic')
def _():
    im = radial('#081a33', '#010206', r=.8); L = canvas(); d = ImageDraw.Draw(L)
    for i in range(18):
        t = i / 18; rr = C * (1 - t) ** 1.4 * .95 + 20; ring(d, C + t * 60, C - t * 40, rr, rr * .85, (120 + int(t * 135), 180 + int(t * 60), 255, int(70 + t * 150)), K * 2.2)
    return glow(over(stars(im, 80, 9), L), 8)
@icon('Binary Stars', 'Cosmic')
def _():
    im = bg_space('#111a35', '#020309'); L = canvas(); d = ImageDraw.Draw(L)
    ring(d, C, C, 420, 150, (255, 255, 255, 60), K * 2)
    d.ellipse((C - 420 - 90, C - 90, C - 420 + 90, C + 90), fill=(255, 205, 140, 255)); d.ellipse((C + 420 - 70, C - 70, C + 420 + 70, C + 70), fill=(160, 205, 255, 255))
    return glow(over(im, L.rotate(-20, center=(C, C))), 24)
@icon('Solar Eclipse', 'Cosmic')
def _():
    im = bg_space('#0a0e1c', '#010103', 60); L = canvas(); d = ImageDraw.Draw(L)
    d.ellipse((C - 300, C - 300, C + 300, C + 300), fill=(255, 225, 170, 255)); cor = glow(L, 40)
    m = canvas(); ImageDraw.Draw(m).ellipse((C - 286, C - 286, C + 286, C + 286), fill=(0, 0, 0, 255))
    rim = canvas(); ImageDraw.Draw(rim).ellipse((C - 292, C - 292, C + 292, C + 292), outline=(255, 250, 235, 255), width=K * 3)
    return over(im, cor, m, glow(rim, 4))
@icon('Crescent Moon', 'Cosmic')
def _():
    im = bg_space('#0e1630', '#02030a', 180); moon = canvas(); d = ImageDraw.Draw(moon)
    d.ellipse((C - 320, C - 320, C + 320, C + 320), fill=(245, 236, 215, 255)); cut = Image.new('L', (N, N), 0); ImageDraw.Draw(cut).ellipse((C - 180, C - 380, C + 420, C + 220), fill=255)
    moon.putalpha(ImageChops.subtract(moon.getchannel('A'), cut)); return glow(over(im, moon), 16)
@icon('Quasar', 'Cosmic')
def _():
    im = bg_space('#0b1124', '#010206'); L = canvas(); d = ImageDraw.Draw(L)
    d.polygon(poly([(-.04, 0), (0, -1), (.04, 0), (0, 1)]), fill=(200, 225, 255, 230)); ring(d, C, C, 300, 70, (255, 190, 120, 220), K * 9)
    d.ellipse((C - 60, C - 60, C + 60, C + 60), fill=(255, 255, 255, 255)); return glow(over(im, L.rotate(25, center=(C, C))), 20)
@icon('Nebula', 'Cosmic')
def _():
    n1, n2 = noise(11), noise(12, scale=4)
    rgb = np.zeros((N, N, 4)); rgb[..., 0] = 40 + 210 * n1 ** 2.2; rgb[..., 1] = 20 + 90 * n2 ** 2; rgb[..., 2] = 60 + 190 * (n1 * n2) ** 1.4; rgb[..., 3] = 255
    return stars(Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGBA'), 160, 13)
@icon('Aurora Planet', 'Cosmic')
def _():
    im = bg_space('#07141a', '#010305'); pm = Image.new('L', (N, N), 0); ImageDraw.Draw(pm).ellipse((C - 300, C - 120, C + 300, C + 480), fill=255)
    planet = fill_mask(linear('#0d3550', '#020a14', 90), pm); L = canvas(); d = ImageDraw.Draw(L)
    for i in range(6): d.arc((C - 360 + i * 10, C - 260 + i * 25, C + 360 - i * 10, C + 360), 200, 340, fill=(80 + i * 20, 255, 190 - i * 10, 150 - i * 18), width=K * 10)
    return over(im, glow(L, 14), planet)
@icon('Astronaut', 'Cosmic')
def _():
    im = bg_space('#121a30', '#030409'); L = canvas(); d = ImageDraw.Draw(L)
    d.ellipse((C - 340, C - 340, C + 340, C + 340), fill=(235, 238, 245, 255)); visor = fill_mask(linear('#f2a144', '#1a2a6a', 120), (lambda m: (ImageDraw.Draw(m).rounded_rectangle((C - 250, C - 190, C + 250, C + 170), 150, fill=255), m)[1])(Image.new('L', (N, N), 0)))
    hl = canvas(); ImageDraw.Draw(hl).ellipse((C - 200, C - 160, C - 60, C - 90), fill=(255, 255, 255, 170)); return over(im, L, visor, hl)
@icon('Rocket', 'Cosmic')
def _():
    im = bg_space('#13183a', '#040512'); L = canvas(); d = ImageDraw.Draw(L)
    d.polygon(poly([(0, -.78), (.2, -.32), (.2, .38), (-.2, .38), (-.2, -.32)]), fill=(240, 242, 248, 255)); d.polygon(poly([(-.2, .1), (-.42, .5), (-.2, .38)]), fill=(242, 161, 68, 255)); d.polygon(poly([(.2, .1), (.42, .5), (.2, .38)]), fill=(242, 161, 68, 255))
    d.ellipse((C - 70, C - 230, C + 70, C - 90), fill=(90, 160, 255, 255)); fl = canvas(); ImageDraw.Draw(fl).polygon(poly([(-.13, .4), (0, .86), (.13, .4)]), fill=(255, 170, 80, 255))
    return over(im, glow(fl, 16), L.rotate(-30, center=(C, C)) if False else L)

# ------------------------------------------------------------------ V monograms (10)
def vicon(bg, fillimg, outline=None, glow_r=0, extra=None):
    im = bg; v = fill_mask(fillimg, vmask(.92, .02))
    if glow_r: v = glow(v, glow_r)
    out = over(im, v)
    if outline: o = canvas(); ImageDraw.Draw(o).polygon(poly([(x * .92, y * .92 + .02) for x, y in VPTS]), outline=outline, width=K * 4); out = over(out, o)
    return extra(out) if extra else out
@icon('Neon V', 'Monogram')
def _():
    o = canvas(); ImageDraw.Draw(o).line(poly([(x * .92, y * .92 + .02) for x, y in VPTS] + [(VPTS[0][0] * .92, VPTS[0][1] * .92 + .02)]), fill=(255, 80, 200, 255), width=K * 9, joint='curve')
    return over(stars(radial('#1a0626', '#04010a'), 40, 2), glow(o, 18), glow(o, 6))
@icon('Liquid Glass V', 'Monogram')
def _(): return vicon(radial('#1d3a6a', '#050a18'), linear('#ffffffcc'[:7], '#7ab8ff', 100), outline=(255, 255, 255, 200), glow_r=10)
@icon('Gold Foil V', 'Monogram')
def _(): return vicon(radial('#1a1206', '#060402'), linear('#fff2c4', '#b07a1c', 70), glow_r=6)
@icon('Chrome V', 'Monogram')
def _(): return vicon(linear('#1a1d24', '#050608', 90), linear('#ffffff', '#5a6170', 95), outline=(255, 255, 255, 140))
@icon('Origami V', 'Monogram')
def _():
    im = radial('#f4efe6', '#d8cfbf', r=.9); d = ImageDraw.Draw(im)
    pts = [(x * .92, y * .92 + .02) for x, y in VPTS]
    for tri, col in [((pts[0], pts[1], pts[5]), (242, 161, 68, 255)), ((pts[1], pts[2], pts[5]), (214, 120, 40, 255)), ((pts[2], pts[3], pts[5]), (250, 190, 110, 255)), ((pts[3], pts[4], pts[5]), (226, 140, 55, 255))]: d.polygon(poly(tri), fill=col)
    return im
@icon('Pixel V', 'Monogram')
def _():
    im = radial('#101830', '#03050c'); d = ImageDraw.Draw(im); m = np.asarray(vmask(.95, .02)); g = 18; cs = N / g
    for i in range(g):
        for j in range(g):
            if m[int((j + .5) * cs), int((i + .5) * cs)] > 0: d.rectangle((i * cs + K * 2, j * cs + K * 2, (i + 1) * cs - K * 2, (j + 1) * cs - K * 2), fill=(90 + i * 8, 220, 255 - i * 6, 255))
    return im
@icon('Constellation V', 'Monogram')
def _():
    im = bg_space('#0d1430', '#02030a', 120, 21); d = ImageDraw.Draw(im); pts = poly([(x * .85, y * .85) for x, y in [(-.56, -.42), (-.28, .02), (0, .52), (.3, .02), (.56, -.42)]])
    d.line(pts, fill=(169, 220, 255, 170), width=K * 3)
    L = canvas(); dl = ImageDraw.Draw(L)
    for x, y in pts: dl.ellipse((x - 22, y - 22, x + 22, y + 22), fill=(255, 255, 255, 255))
    return glow(over(im, L), 10)
@icon('Brush V', 'Monogram')
def _():
    im = radial('#1b1b1f', '#060607'); L = canvas(); d = ImageDraw.Draw(L); r = random.Random(5)
    for k in range(40):
        j = lambda: (r.random() - .5) * 26 * K
        d.line([(C - .5 * C + j(), C - .4 * C + j()), (C + j(), C + .5 * C + j()), (C + .5 * C + j(), C - .4 * C + j())], fill=(255, 130 + r.randint(0, 70), 60, 60), width=K * 16, joint='curve')
    return over(im, L)
@icon('Stone V', 'Monogram')
def _():
    n = noise(31, scale=6); st = np.zeros((N, N, 4)); g = 70 + 80 * n; st[..., 0] = g; st[..., 1] = g * .96; st[..., 2] = g * .9; st[..., 3] = 255
    stone = Image.fromarray(st.astype(np.uint8), 'RGBA'); v = vmask(.92, .02); carved = fill_mask(Image.fromarray((st * [.45, .45, .45, 1]).astype(np.uint8), 'RGBA'), v)
    sh = fill_mask(Image.new('RGBA', (N, N), (255, 255, 255, 90)), vmask(.92, .028).filter(ImageFilter.GaussianBlur(4)))
    return over(stone, sh, carved)
@icon('Holographic V', 'Monogram')
def _():
    y, x = np.mgrid[0:N, 0:N] / N; h = (x * 1.3 + y * .7) % 1
    rgb = np.stack([.5 + .5 * np.cos(6.283 * (h + 0)), .5 + .5 * np.cos(6.283 * (h + .33)), .5 + .5 * np.cos(6.283 * (h + .66)), np.ones_like(h)], -1) * [255, 255, 255, 255]
    return vicon(radial('#14141c', '#040406'), Image.fromarray((rgb * [.9, .9, .9, 1] + [25, 25, 25, 0]).astype(np.uint8), 'RGBA'), outline=(255, 255, 255, 160), glow_r=8)

# ------------------------------------------------------------------ money (8)
def glyph(txt, col, bgimg, size=.9, dy=0):
    L = canvas(); d = ImageDraw.Draw(L); f = font(N * size * .62)
    bb = d.textbbox((0, 0), txt, font=f); d.text((C - (bb[0] + bb[2]) / 2, C - (bb[1] + bb[3]) / 2 + dy * C), txt, font=f, fill=col); return L
@icon('Rupee Orb', 'Money')
def _():
    im = bg_space('#121a33', '#03040a'); orb = canvas(); ImageDraw.Draw(orb).ellipse((C - 340, C - 340, C + 340, C + 340), fill=(242, 161, 68, 255))
    sh = fill_mask(radial('#ffe0a8', '#b8661c', .38, .32, .7), orb.getchannel('A')); return over(im, glow(sh, 14), glyph('₹', (40, 22, 6, 255), None, .85))
@icon('Coin Stack', 'Money')
def _():
    im = radial('#14161f', '#05060a'); L = canvas(); d = ImageDraw.Draw(L)
    for i in range(6): y = C + 300 - i * 90; d.ellipse((C - 300, y - 70, C + 300, y + 70), fill=(200 - i * 5, 140, 50, 255)); d.ellipse((C - 300, y - 92, C + 300, y + 48), fill=(250, 200, 110, 255))
    return over(im, glow(L, 8), glyph('₹', (150, 90, 20, 255), None, .38, -.32))
@icon('Wallet', 'Money')
def _():
    im = radial('#1a1f33', '#05070c'); L = canvas(); d = ImageDraw.Draw(L)
    d.rounded_rectangle((C - 380, C - 250, C + 380, C + 300), 70, fill=(35, 40, 60, 255)); d.rounded_rectangle((C - 380, C - 330, C + 300, C - 120), 60, fill=(242, 161, 68, 255))
    d.rounded_rectangle((C + 150, C - 40, C + 420, C + 120), 40, fill=(20, 24, 38, 255)); d.ellipse((C + 220, C + 10, C + 290, C + 80), fill=(169, 220, 255, 255)); return over(im, glow(L, 6))
@icon('QR Glyph', 'Money')
def _():
    im = radial('#0c1226', '#02040a'); d = ImageDraw.Draw(im); r = random.Random(8); g = 13; cs = 0.78 * N / g; o = (N - cs * g) / 2
    for i in range(g):
        for j in range(g):
            fin = (i < 4 and j < 4) or (i > 8 and j < 4) or (i < 4 and j > 8)
            if fin or r.random() < .45: d.rounded_rectangle((o + i * cs + K, o + j * cs + K, o + (i + 1) * cs - K, o + (j + 1) * cs - K), K * 3, fill=(242, 161, 68, 255) if fin else (230, 236, 255, 255))
    return im
@icon('Card', 'Money')
def _():
    im = bg_space('#121833', '#03040a', 60); card = fill_mask(linear('#2a3a80', '#0c1236', 30), (lambda m: (ImageDraw.Draw(m).rounded_rectangle((C - 400, C - 250, C + 400, C + 250), 60, fill=255), m)[1])(Image.new('L', (N, N), 0)))
    d = ImageDraw.Draw(card); d.rounded_rectangle((C - 320, C - 120, C - 180, C - 10), 20, fill=(242, 190, 100, 255)); d.text((C - 320, C + 90), '•••• 2026', font=font(N * .07), fill=(220, 230, 255, 255))
    return over(im, glow(card, 10))
@icon('Coin Planet', 'Money')
def _():
    im = bg_space('#0f1530', '#02030a'); p = canvas(); ImageDraw.Draw(p).ellipse((C - 260, C - 260, C + 260, C + 260), fill=(242, 175, 80, 255))
    back = canvas(); front = canvas(); bd, fd = ImageDraw.Draw(back), ImageDraw.Draw(front)
    for k in range(14):
        a = k / 14 * 6.283; x, y = C + math.cos(a) * 480, C + math.sin(a) * 130; dd = fd if math.sin(a) > 0 else bd; dd.ellipse((x - 34, y - 34, x + 34, y + 34), fill=(255, 220, 140, 255))
    return over(im, back.rotate(-15, center=(C, C)), glow(p, 10), glyph('₹', (120, 60, 10, 255), None, .55), front.rotate(-15, center=(C, C)))
@icon('Vault', 'Money')
def _():
    im = radial('#20252f', '#07080b'); L = canvas(); d = ImageDraw.Draw(L)
    d.rounded_rectangle((C - 380, C - 380, C + 380, C + 380), 80, fill=(60, 66, 80, 255)); d.ellipse((C - 240, C - 240, C + 240, C + 240), fill=(32, 36, 46, 255)); ring(d, C, C, 240, 240, (242, 161, 68, 255), K * 6)
    for k in range(3): a = k / 3 * 6.283; d.line((C, C, C + math.cos(a) * 180, C + math.sin(a) * 180), fill=(200, 205, 215, 255), width=K * 10)
    d.ellipse((C - 50, C - 50, C + 50, C + 50), fill=(242, 161, 68, 255)); return over(im, L)
@icon('Receipt', 'Money')
def _():
    im = bg_space('#141a33', '#03040a', 70); L = canvas(); d = ImageDraw.Draw(L); pts = [(C - 280, C - 400), (C + 280, C - 400), (C + 280, C + 360)]
    zig = [(C + 280 - i * 70, C + 360 + (35 if i % 2 else 0)) for i in range(9)]; d.polygon(pts + zig + [(C - 280, C + 360)], fill=(246, 244, 238, 255))
    for i, w in enumerate([.8, .6, .7, .5]): d.rounded_rectangle((C - 200, C - 300 + i * 90, C - 200 + 400 * w, C - 270 + i * 90), 10, fill=(180, 186, 200, 255))
    d.text((C - 200, C + 100), '₹ 1,250', font=font(N * .1), fill=(30, 30, 40, 255)); return over(im, glow(L, 8))

# ------------------------------------------------------------------ minimal (8)
@icon('Gradient Orb', 'Minimal')
def _():
    im = radial('#0a0a12', '#000000'); orb = fill_mask(radial('#ffe0b0', '#7a2cff', .35, .3, .9), (lambda m: (ImageDraw.Draw(m).ellipse((C - 330, C - 330, C + 330, C + 330), fill=255), m)[1])(Image.new('L', (N, N), 0)))
    return over(im, glow(orb, 20))
@icon('Line Black Hole', 'Minimal')
def _():
    im = Image.new('RGBA', (N, N), (8, 8, 12, 255)); d = ImageDraw.Draw(im)
    ring(d, C, C, 520, 110, (255, 255, 255, 230), K * 4); d.ellipse((C - 170, C - 170, C + 170, C + 170), fill=(8, 8, 12, 255)); ring(d, C, C, 170, 170, (255, 255, 255, 255), K * 4)
    d.arc((C - 520, C - 110, C + 520, C + 110), 0, 180, fill=(255, 255, 255, 230), width=K * 4); return im
@icon('Geometric', 'Minimal')
def _():
    im = linear('#0f1226', '#05060c', 90); d = ImageDraw.Draw(im); cols = [(242, 161, 68, 230), (169, 220, 255, 220), (255, 120, 150, 200)]
    for k, (pts) in enumerate([[(-.6, .5), (0, -.6), (.6, .5)], [(-.3, .55), (.25, -.2), (.7, .55)], [(-.7, .55), (-.35, 0), (0, .55)]]): d.polygon(poly(pts), fill=cols[k])
    return im
@icon('Retro Sunset', 'Minimal')
def _():
    im = linear('#2b0b45', '#ff7a4a', 90); d = ImageDraw.Draw(im); sun = fill_mask(linear('#ffe27a', '#ff4f8b', 90), (lambda m: (ImageDraw.Draw(m).ellipse((C - 300, C - 380, C + 300, C + 220), fill=255), m)[1])(Image.new('L', (N, N), 0)))
    out = over(im, sun); d = ImageDraw.Draw(out)
    for i in range(7): y = C + 10 + i * 34 + i * i * 4; d.rectangle((0, y, N, y + 10 + i * 2), fill=(43, 11, 69, 255))
    d.rectangle((0, C + 230, N, N), fill=(25, 6, 40, 255))
    for i in range(-8, 9): d.line((C + i * 20, C + 230, C + i * 160, N), fill=(255, 90, 200, 160), width=K * 2)
    return out
@icon('₹ Glyph', 'Minimal')
def _(): return over(Image.new('RGBA', (N, N), (12, 12, 16, 255)), glyph('₹', (242, 161, 68, 255), None, .95))
@icon('Dot Matrix V', 'Minimal')
def _():
    im = Image.new('RGBA', (N, N), (6, 8, 14, 255)); d = ImageDraw.Draw(im); m = np.asarray(vmask(.95, .02)); g = 22; cs = N / g
    for i in range(g):
        for j in range(g):
            on = m[int((j + .5) * cs), int((i + .5) * cs)] > 0; r = cs * (.36 if on else .12)
            d.ellipse(((i + .5) * cs - r, (j + .5) * cs - r, (i + .5) * cs + r, (j + .5) * cs + r), fill=(242, 161, 68, 255) if on else (60, 66, 90, 255))
    return im
@icon('Duotone Wave', 'Minimal')
def _():
    im = Image.new('RGBA', (N, N), (8, 14, 30, 255)); d = ImageDraw.Draw(im)
    for k in reversed(range(9)):
        pts = [(x, C + 260 - k * 80 + math.sin(x / N * 6.283 * 1.5 + k * .5) * 60) for x in range(0, N + 20, 20)]
        d.polygon(pts + [(N, N), (0, N)], fill=(30 + k * 20, 60 + k * 18, 160 + k * 10, 255) if k % 2 else (242, 140 + k * 8, 68, 255))
    return im
@icon('Paper Cut', 'Minimal')
def _():
    im = Image.new('RGBA', (N, N), (18, 22, 46, 255))
    for k, col in enumerate(['#26305e', '#35407a', '#4a5598', '#6a6fb8', '#f2a144']):
        L = canvas(); d = ImageDraw.Draw(L); off = k * .14
        pts = [(x, C + 120 + k * 90 - 90 * math.sin(x / N * 3.1416 * (1.2 + k * .15) + k)) for x in range(0, N + 20, 20)]
        d.polygon(pts + [(N, N), (0, N)], fill=hexc(col)); sh = L.filter(ImageFilter.GaussianBlur(10 * K)); im = over(im, Image.fromarray((np.asarray(sh) * [0, 0, 0, .6]).astype(np.uint8), 'RGBA'), L)
    d = ImageDraw.Draw(im); d.ellipse((C + 140, C - 330, C + 330, C - 140), fill=(255, 236, 200, 255)); return im

if __name__ == '__main__':
    cat = json.load(open(os.path.join(WWW, 'catalog.json'), encoding='utf-8'))
    cat['icons'] = [i for i in cat['icons'] if i['id'] <= 36]
    def rounded(im, r=.27):
        m = Image.new('L', (im.width * 4, im.height * 4), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, m.width - 1, m.height - 1), radius=int(m.width * r), fill=255)
        m = m.resize(im.size, Image.LANCZOS); out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.paste(im, (0, 0), m); return out
    for k, (name, kind, fn) in enumerate(ICONS):
        iid = 37 + k; nn = f'{iid:02d}'
        big = fn().convert('RGBA'); flat = Image.new('RGB', big.size, (2, 3, 7)); flat.paste(big, (0, 0), big)
        im = flat.resize((S, S), Image.LANCZOS)
        im.save(os.path.join(RES, 'drawable-nodpi', f'vv_ai_{nn}.png'), optimize=True)
        open(os.path.join(RES, 'mipmap-anydpi-v26', f'vv_ic_{nn}.xml'), 'w').write(f'<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/vv_ai_bg"/>\n    <foreground android:drawable="@drawable/vv_ai_{nn}"/>\n</adaptive-icon>\n')
        c = int(S * 72 / 108); o = (S - c) // 2; vis = im.crop((o, o, o + c, o + c))
        rounded(vis.resize((192, 192), Image.LANCZOS)).save(os.path.join(RES, 'mipmap-xxxhdpi', f'vv_ic_{nn}.png'), optimize=True)
        vis.resize((144, 144), Image.LANCZOS).save(os.path.join(WWW, f'{nn}.webp'), quality=88)
        cat['icons'].append({'id': iid, 'name': name, 'view': kind}); print(iid, name, flush=True)
    MORE = ['Antariksh', 'Brahmand', 'Akash', 'Dhruv', 'Tara', 'Surya', 'Chandra', 'Kosh', 'Tijori', 'Bachat', 'वेदांत', 'वेदवर्स', 'पे', 'ｖｅｄａｎｔ', 'ᵛᵉᵈᵃⁿᵗ', 'ʇuɐpǝʌ', 'V̶e̶d̶a̶n̶t̶', 'Ⓥⓔⓓ', '🌌 Ved', '⚫ Pay', '🪐 Orbit', '✨ Vedant', '💫 Vedverse', '🚀 Pay', 'Ved.', 'V.', 'VV', 'Vedz', 'Calculator', 'Notes', 'Clock', 'Pocket', 'Paywave', 'Starpay', 'Nebula Pay', 'Moneyverse']
    cat['names'] = cat['names'][:64] + MORE
    json.dump(cat, open(os.path.join(WWW, 'catalog.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('icons:', len(cat['icons']), 'names:', len(cat['names']), '→', len(cat['icons']) * len(cat['names']), 'launcher entries')
