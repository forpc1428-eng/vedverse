#!/usr/bin/env python3
"""Ray-traced black-hole app icons (preview only). Same physics as the app: photons integrated through
Schwarzschild space (Rs = 1), thin accretion disk 3..12 Rs with Doppler beaming + gravitational redshift,
the baked Vedverse sky lensed around the hole."""
import os, math, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.dirname(os.path.abspath(__file__))
ROOT = r'C:\Users\vedan\Desktop\vedverse'
F = np.float32
N = int(os.environ.get('ICON_N', 384))

sky = np.asarray(Image.open(os.path.join(ROOT, 'www', 'assets', 'space', 'sky-4k.webp')).convert('RGB'), F) / 255.0
disk = np.asarray(Image.open(os.path.join(ROOT, 'www', 'assets', 'space', 'disk.png')).convert('RGB'), F) / 255.0
SH, SW = sky.shape[:2]; DH, DW = disk.shape[:2]


def blackbody(T):
    t = np.asarray(T, F) / 100.0
    r = np.where(t <= 66, 1.0, np.clip(1.29293618606 * np.power(np.maximum(t - 60, 1e-3), -0.1332047592), 0, 1))
    g = np.where(t <= 66, np.clip(0.39008157876 * np.log(np.maximum(t, 1e-3)) - 0.63184144378, 0, 1), np.clip(1.12989086089 * np.power(np.maximum(t - 60, 1e-3), -0.0755148492), 0, 1))
    b = np.where(t >= 66, 1.0, np.where(t <= 19, 0.0, np.clip(0.54320678911 * np.log(np.maximum(t - 10, 1e-3)) - 1.19625408914, 0, 1)))
    return np.stack([r, g, b], -1).astype(F) ** 2.2


def sample_sky(d, yaw):
    x, y, z = d[..., 0], d[..., 1], d[..., 2]
    c, s = math.cos(yaw), math.sin(yaw)
    x, z = c * x - s * z, s * x + c * z
    u = (np.arctan2(z, x) / (2 * np.pi) + 0.5) * (SW - 1)
    v = (1 - (np.arcsin(np.clip(y, -1, 1)) / np.pi + 0.5)) * (SH - 1)
    return sky[v.astype(np.int32).clip(0, SH - 1), u.astype(np.int32) % SW]


def render(incl_deg, roll_deg, temp, tint=None, tint_amt=0.0, sat=1.0, dist=34.0, fov=52.0, bg='sky', yaw=0.0, glow=1.0, bright=1.0):
    n = N
    ys, xs = np.mgrid[0:n, 0:n].astype(F)
    px = (xs + 0.5) / n * 2 - 1; py = 1 - (ys + 0.5) / n * 2
    th = math.tan(math.radians(fov / 2))
    # camera looks at the hole from distance `dist` (Rs), tilted so the disk is seen at `incl` from face-on
    inc = math.radians(incl_deg); rl = math.radians(roll_deg)
    cam = np.array([0, -math.sin(inc), math.cos(inc)], F) * dist      # inc = angle between view and disk normal
    fwd = -cam / np.linalg.norm(cam)
    up0 = np.array([0, 0, 1], F) if abs(fwd[2]) < 0.99 else np.array([0, 1, 0], F)
    right = np.cross(fwd, up0); right /= np.linalg.norm(right)
    up = np.cross(right, fwd)
    right, up = right * math.cos(rl) + up * math.sin(rl), -right * math.sin(rl) + up * math.cos(rl)
    d = fwd[None, None, :] + right[None, None, :] * (px * th)[..., None] + up[None, None, :] * (py * th)[..., None]
    d /= np.linalg.norm(d, axis=-1, keepdims=True)
    p = np.broadcast_to(cam, d.shape).astype(F).copy(); v = d.copy()
    h2 = np.sum(np.cross(p, v) ** 2, -1)
    col = np.zeros(d.shape, F); trans = np.ones(d.shape[:2], F); alive = np.ones(d.shape[:2], bool); cap = np.zeros(d.shape[:2], bool)
    # disk plane = z=0 (normal +z)
    for _ in range(260):
        r2 = np.sum(p * p, -1); r = np.sqrt(r2)
        dt = np.clip(0.06 * r, 0.02, 1.2)[..., None]
        a = -1.5 * h2[..., None] * p / (r2 * r2 * r)[..., None]
        v2 = v + a * dt; p2 = p + v2 * dt
        cross = alive & (p[..., 2] * p2[..., 2] < 0)
        if cross.any():
            f = (p[..., 2] / (p[..., 2] - p2[..., 2]))[..., None]
            c = p + (p2 - p) * f
            rc = np.sqrt(c[..., 0] ** 2 + c[..., 1] ** 2)
            hit = cross & (rc > 2.9) & (rc < 12.5)
            if hit.any():
                ang = np.arctan2(c[..., 1], c[..., 0])
                uu = ((ang / (2 * np.pi) + 0.5) * (DW - 1)).astype(np.int32) % DW
                vv = ((1 - np.clip((rc - 3) / 9, 0, 1)) * (DH - 1)).astype(np.int32)
                tx = disk[vv, uu]
                dens = (tx[..., 0] * 0.8 + tx[..., 1] * 0.6) ** 2
                edge = np.clip((rc - 2.95) / 0.45, 0, 1) * np.clip((12.5 - rc) / 5.5, 0, 1)
                vel = np.stack([-c[..., 1], c[..., 0], np.zeros_like(rc)], -1); vel /= np.maximum(np.linalg.norm(vel, axis=-1, keepdims=True), 1e-6)
                beta = np.clip(np.sqrt(0.5 / np.maximum(rc - 1, 0.5)), 0, 0.62)
                vn = v2 / np.linalg.norm(v2, axis=-1, keepdims=True)
                cosT = np.sum(vel * -vn, -1)
                g = np.sqrt(1 - beta ** 2) / (1 - beta * cosT) * np.sqrt(np.maximum(1 - 1.5 / rc, 0.05))
                beam = 1 + 0.72 * (g ** 3.5 - 1)
                Tl = temp * (3 / np.maximum(rc, 3)) ** 0.62 * np.clip(g, 0.45, 1.7)
                bb = blackbody(Tl)
                lum = (bb @ np.array([0.2126, 0.7152, 0.0722], F))[..., None]
                bb = lum + (bb - lum) * sat
                if tint is not None: bb = bb * (1 - tint_amt) + lum * np.array(tint, F) * 1.7 * tint_amt
                I = (3 / np.maximum(rc, 3)) ** 1.7 * edge * (0.22 + 1.7 * dens + 1.4 * tx[..., 2] * dens) * beam * bright
                al = np.clip(edge * (0.28 + 1.1 * dens), 0, 0.96)
                e = bb * (I * 2.6 * al)[..., None]
                m = hit[..., None]
                col = np.where(m, col + trans[..., None] * e, col)
                trans = np.where(hit, trans * (1 - al), trans)
        p = np.where(alive[..., None], p2, p); v = np.where(alive[..., None], v2, v)
        newcap = alive & (np.sum(p * p, -1) < 1.0)
        cap |= newcap; alive &= ~newcap
        escaped = alive & (np.sqrt(np.sum(p * p, -1)) > dist + 6) & (np.sum(p * v, -1) > 0)
        alive &= ~escaped
        alive &= trans > 0.01
        if not alive.any(): break
    vn = v / np.linalg.norm(v, axis=-1, keepdims=True)
    if bg == 'sky': back = sample_sky(vn[..., [0, 2, 1]] * np.array([1, 1, -1], F), yaw) ** 1.0
    elif bg == 'stars':
        hsh = np.abs(np.sin(vn[..., 0] * 1271.1 + vn[..., 1] * 3117.7 + vn[..., 2] * 9311.3) * 43758.5) % 1
        back = np.where(hsh[..., None] > 0.9965, 1.0, 0.0).astype(F) * np.array([1, .95, .9], F) + np.array([0.008, 0.01, 0.02], F)
    else: back = np.zeros_like(col) + np.array([0.003, 0.004, 0.008], F)
    back = np.where(cap[..., None], 0.0, back)
    # glow halo (screen-space) around the hole
    rr = np.sqrt(px ** 2 + py ** 2)
    gc = blackbody(np.array(temp * 0.8, F)); gc = gc / gc.max()
    if tint is not None: gc = gc * (1 - tint_amt) + np.array(tint, F) / max(tint) * tint_amt
    halo = (np.exp(-np.maximum(rr - 0.12, 0) * 5.0) * 0.10 * glow * (~cap))[..., None] * gc
    disk_d = np.clip(1 - np.exp(-col * 1.5), 0, 1) ** (1 / 2.2)
    out = 1 - (1 - back * trans[..., None]) * (1 - disk_d)
    out = 1 - (1 - out) * np.exp(-halo * 3)
    # vignette
    out *= (1 - 0.35 * np.clip(rr - 0.55, 0, 1) ** 1.5)[..., None]
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), 'RGB')


# 12 colour schemes × 3 compositions = 36 icons
COLORS = [
    ('Gargantua', 6400, None, 0), ('Solar Gold', 6000, (1.0, 0.81, 0.35), .7), ('Inferno', 3600, (1.0, 0.42, 0.10), .75),
    ('Crimson', 4600, (1.0, 0.23, 0.31), .8), ('Rose Gold', 5200, (1.0, 0.69, 0.60), .7), ('Magenta', 10000, (0.94, 0.44, 1.0), .8),
    ('Violet', 9500, (0.65, 0.49, 1.0), .8), ('Indigo', 12000, (0.45, 0.48, 1.0), .8), ('Glacier', 15000, (0.55, 0.91, 1.0), .75),
    ('Cosmic Teal', 9000, (0.22, 0.94, 0.85), .8), ('Emerald', 7800, (0.30, 1.0, 0.65), .8), ('Eclipse Silver', 7000, None, 0),
]
COMPS = [  # (name, inclination from face-on, roll, distance, background)
    ('Edge', 84, -12, 33, 'sky'),
    ('Tilt', 66, 16, 30, 'stars'),
    ('Halo', 22, 0, 36, 'sky'),
]

if __name__ == '__main__':
    os.makedirs(os.path.join(OUT, 'png'), exist_ok=True)
    k = 0
    for ci, (cname, T, tint, ta) in enumerate(COLORS):
        for (comp, inc, roll, dist, bg) in COMPS:
            k += 1
            sat = 0.0 if cname == 'Eclipse Silver' else 1.0
            im = render(inc, roll, T, tint, ta, sat=sat, dist=dist, bg=bg, yaw=ci * 0.7 + 1.1)
            im.save(os.path.join(OUT, 'png', f'{k:02d}.png'))
            print(k, cname, comp, flush=True)
