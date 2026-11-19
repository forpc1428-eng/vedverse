#!/usr/bin/env python3
"""
Vedverse - deep-space texture baker.

Bakes every space texture the app uses, procedurally and offline, so the phone only samples
images at runtime (no live noise = much cheaper per frame AND far more detail than a phone
could compute live). Everything is original and ships inside the app.

  www/assets/space/sky-8k.webp  8192x4096 equirectangular sky: Milky Way band, galactic bulge,
                                dust lanes with reddening, H-alpha / OIII / reflection nebulae,
                                faint IFN wisps, ~1.5M stars with blackbody colours, tiny galaxies
  www/assets/space/sky-4k.webp  4096x2048 version for lighter phones
  www/assets/space/disk.png     2048x512 polar plasma map for the accretion disk
                                (R: plasma density, G: filaments, B: hot clumps)

Run:  python scripts/bake-space.py      (numpy + Pillow, ~2-5 min)
Equirect convention (matches universe.js):
  u = atan2(d.z, d.x) / 2pi + 0.5,  v = asin(d.y) / pi + 0.5,  image row 0 = v 1 (top).
"""
import os, sys, time, math
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', 'www', 'assets', 'space'))
F = np.float32
T0 = time.time()
def log(*a): print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)


class Perlin:
    """Vectorised 3D gradient noise, output roughly in [-1, 1]."""
    G = np.array([[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
                  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]], F)

    def __init__(self, seed):
        p = np.random.default_rng(seed).permutation(256).astype(np.int32)
        self.p = np.concatenate([p, p, p])
        self.gx, self.gy, self.gz = self.G[:, 0], self.G[:, 1], self.G[:, 2]

    def __call__(self, x, y, z):
        p = self.p
        xi, yi, zi = np.floor(x), np.floor(y), np.floor(z)
        xf, yf, zf = (x - xi).astype(F), (y - yi).astype(F), (z - zi).astype(F)
        X, Y, Z = xi.astype(np.int32) & 255, yi.astype(np.int32) & 255, zi.astype(np.int32) & 255
        u = xf * xf * xf * (xf * (xf * 6 - 15) + 10)
        v = yf * yf * yf * (yf * (yf * 6 - 15) + 10)
        w = zf * zf * zf * (zf * (zf * 6 - 15) + 10)
        A = p[X] + Y; AA = p[A] + Z; AB = p[A + 1] + Z
        B = p[X + 1] + Y; BA = p[B] + Z; BB = p[B + 1] + Z

        def g(h, dx, dy, dz):
            h = p[h] % 12
            return self.gx[h] * dx + self.gy[h] * dy + self.gz[h] * dz
        x1 = g(AA, xf, yf, zf); x1 = x1 + u * (g(BA, xf - 1, yf, zf) - x1)
        x2 = g(AB, xf, yf - 1, zf); x2 = x2 + u * (g(BB, xf - 1, yf - 1, zf) - x2)
        y1 = x1 + v * (x2 - x1)
        x3 = g(AA + 1, xf, yf, zf - 1); x3 = x3 + u * (g(BA + 1, xf - 1, yf, zf - 1) - x3)
        x4 = g(AB + 1, xf, yf - 1, zf - 1); x4 = x4 + u * (g(BB + 1, xf - 1, yf - 1, zf - 1) - x4)
        y2 = x3 + v * (x4 - x3)
        return y1 + w * (y2 - y1)


def fbm(n, x, y, z, octaves, lac=2.03, gain=0.5):
    s = np.zeros(np.shape(x), F); a = 1.0; f = 1.0; norm = 0.0
    for i in range(octaves):
        s += a * n(x * f + i * 17.31, y * f - i * 9.13, z * f + i * 5.71)
        norm += a; a *= gain; f *= lac
    return s / norm


def ridged(n, x, y, z, octaves, lac=2.1, gain=0.55):
    s = np.zeros(np.shape(x), F); a = 1.0; f = 1.0; norm = 0.0
    for i in range(octaves):
        r = 1.0 - np.abs(n(x * f + i * 3.7, y * f + i * 11.1, z * f - i * 7.3)); r = r * r
        s += a * r; norm += a; a *= gain; f *= lac
    return s / norm


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def norm3(v):
    v = np.asarray(v, F); return v / np.linalg.norm(v)


# ---------------------------------------------------------------- galactic frame
# The camera looks down -z and the black hole sits ~16 deg above centre, so the galactic
# bulge is placed right behind it (the lensing then wraps the brightest light around the hole).
FB = norm3([0, math.sin(math.radians(16)), -math.cos(math.radians(16))])
RIGHT = norm3([1, 0, 0]); UP = norm3(np.cross(RIGHT, FB))
BAND_ANGLE = math.radians(28)
TAN = norm3(math.cos(BAND_ANGLE) * RIGHT + math.sin(BAND_ANGLE) * UP)
NP = norm3(np.cross(FB, TAN))
DELTA = -0.75   # galactic core sits ~43 deg away along the band: an arm crosses behind the hole, the rest stays deep and dark
CEN = norm3(FB * math.cos(DELTA) + TAN * math.sin(DELTA))
EAX = norm3(np.cross(NP, CEN))

N = [Perlin(1000 + i) for i in range(16)]


def fields(x, y, z):
    """HDR linear sky radiance (without point stars) + dust transmission, for any direction arrays."""
    bsin = x * NP[0] + y * NP[1] + z * NP[2]
    b = np.arcsin(np.clip(bsin, -1, 1))
    l = np.arctan2(x * EAX[0] + y * EAX[1] + z * EAX[2], x * CEN[0] + y * CEN[1] + z * CEN[2])

    wn = fbm(N[0], x * 2.2, y * 2.2, z * 2.2, 4)
    sig = 0.10 * (1 + 0.6 * wn) + 0.11 * np.exp(-(l / 0.42) ** 2)
    band = np.exp(-(b / sig) ** 2)
    along = 0.22 + 0.78 * np.exp(-(l / 1.3) ** 2)
    bulge = np.exp(-(l / 0.30) ** 2 - (b / 0.15) ** 2)
    clouds = np.clip(fbm(N[1], x * 4.6, y * 4.6, z * 4.6, 6) * 0.5 + 0.5, 0, 1) ** 1.7
    grain = fbm(N[2], x * 34, y * 34, z * 34, 3) * 0.5 + 0.5
    light = band * along * (0.15 + 1.9 * clouds) * (0.6 + 0.8 * grain) + bulge * 1.9 * (0.75 + 0.5 * grain)
    halo = np.exp(-(b / 0.55) ** 2) * along * 0.06          # faint thick-disk glow
    warm = np.clip(bulge * 1.6 + np.exp(-(l / 0.8) ** 2) * 0.35, 0, 1)[..., None]
    wcol = (1 - warm) * np.array([0.82, 0.86, 0.96], F) + warm * np.array([1.0, 0.82, 0.62], F)

    # dust lanes: domain-warped ridged noise, concentrated in the plane, absorbs blue more (reddening)
    wx = fbm(N[3], x * 3, y * 3, z * 3, 3); wy = fbm(N[4], x * 3 + 5, y * 3, z * 3, 3)
    dx, dy, dz = x + 0.22 * wx, y + 0.22 * wy, z + 0.22 * (wx - wy)
    dust = ridged(N[5], dx * 6.5, dy * 6.5, dz * 6.5, 5)
    dcl = fbm(N[12], dx * 4.5, dy * 4.5, dz * 4.5, 6) * 0.5 + 0.5
    dust2 = fbm(N[6], dx * 15, dy * 15, dz * 15, 4) * 0.5 + 0.5
    dmask = np.exp(-(b / (sig * 1.3)) ** 2) * (0.55 + 0.45 * along)
    A = (np.clip(dcl - 0.45, 0, None) * 11.0 * (0.6 + 0.8 * dust2) + np.clip((dust - 0.62) * 2.5, 0, None) * 1.2) * dmask
    A += bulge * np.clip(dcl - 0.40, 0, None) * 4.0 * np.exp(-(b / 0.035) ** 2)   # dark rift through the core
    trans = np.exp(-A[..., None] * np.array([0.6, 0.78, 1.0], F))

    # emission nebulae (subtle, astrophoto-realistic)
    ha = fbm(N[7], x * 3.1, y * 3.1, z * 3.1, 5)
    hmask = smooth(0.12, 0.5, ha) * np.exp(-(b / 0.28) ** 2)
    hdet = ridged(N[8], dx * 11, dy * 11, dz * 11, 4)
    H = (hmask * (0.25 + 1.2 * hdet ** 2))[..., None] * np.array([1.0, 0.16, 0.22], F) * 0.12
    oi = fbm(N[9], x * 4.2 + 9, y * 4.2, z * 4.2, 4)
    O = (smooth(0.22, 0.55, oi) * np.exp(-(b / 0.22) ** 2) * hdet)[..., None] * np.array([0.10, 0.55, 0.62], F) * 0.07
    rf = fbm(N[10], x * 5 - 3, y * 5, z * 5, 4)
    R = (smooth(0.28, 0.6, rf) * (0.4 + 0.6 * grain))[..., None] * np.array([0.25, 0.42, 1.0], F) * 0.05

    # integrated flux nebula: faint dusty wisps everywhere (what makes deep photos feel 'textured')
    ifn = ridged(N[11], dx * 2.3, dy * 2.3, dz * 2.3, 6)
    I = (np.clip(ifn - 0.5, 0, None) ** 1.3)[..., None] * np.array([0.55, 0.48, 0.42], F) * 0.05

    base = np.array([0.0028, 0.0036, 0.0075], F) + (0.003 * (y * 0.5 + 0.5))[..., None] * np.array([0.2, 0.3, 0.6], F)
    rgb = base + (light[..., None] * 0.46 + halo[..., None]) * wcol * trans + (H + O) * np.sqrt(trans) + R * trans + I
    return rgb.astype(F), trans.astype(F), (band * along + bulge).astype(F)


def dirs(W, H, j0, j1):
    u = (np.arange(W, dtype=F) + 0.5) / W
    v = 1 - (np.arange(j0, j1, dtype=F) + 0.5) / H
    lon = (u - 0.5) * 2 * np.pi; lat = (v - 0.5) * np.pi
    cl = np.cos(lat)[:, None]
    x = cl * np.cos(lon)[None, :]; z = cl * np.sin(lon)[None, :]
    y = np.broadcast_to(np.sin(lat)[:, None], x.shape).copy()
    return x.astype(F), y.astype(F), z.astype(F)


def blackbody(T):
    """Approximate blackbody -> linear RGB, luminance normalised. T in Kelvin (array)."""
    t = np.asarray(T, F) / 100.0
    r = np.where(t <= 66, 255.0, 329.698727446 * np.power(np.maximum(t - 60, 1e-3), -0.1332047592))
    g = np.where(t <= 66, 99.4708025861 * np.log(np.maximum(t, 1e-3)) - 161.1195681661,
                 288.1221695283 * np.power(np.maximum(t - 60, 1e-3), -0.0755148492))
    bb = np.where(t >= 66, 255.0, np.where(t <= 19, 0.0, 138.5177312231 * np.log(np.maximum(t - 10, 1e-3)) - 305.0447927307))
    c = np.clip(np.stack([r, g, bb], -1) / 255.0, 0, 1) ** 2.2
    lum = c @ np.array([0.2126, 0.7152, 0.0722], F)
    return (c / np.maximum(lum, 1e-4)[..., None]).astype(F)


def tonemap(c):
    c = np.maximum(c, 0)
    a = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14)
    return np.clip(a, 0, 1) ** (1 / 2.2)


# ---------------------------------------------------------------- sky
def bake_sky(W=8192):
    H = W // 2
    w2, h2 = min(W // 2, 2048), min(H // 2, 1024)   # nebula is smooth: bake it lighter, detail comes from the full-res grain + stars
    log(f'nebula field {w2}x{h2}')
    neb = np.zeros((h2, w2, 3), F)
    step = 32
    for j in range(0, h2, step):
        x, y, z = dirs(w2, h2, j, min(h2, j + step))
        neb[j:j + step] = fields(x, y, z)[0]
    log('upsampling to', W, 'x', H)
    up = np.zeros((H, W, 3), F)
    for c in range(3):
        up[..., c] = np.asarray(Image.fromarray(neb[..., c], 'F').resize((W, H), Image.BICUBIC))
    del neb

    log('fine grain pass')
    nf = Perlin(77)
    for j in range(0, H, 128):
        x, y, z = dirs(W, H, j, min(H, j + 128))
        lum = up[j:j + 128].mean(-1, keepdims=True)
        g = fbm(nf, x * 160, y * 160, z * 160, 2)[..., None]
        up[j:j + 128] *= (1 + 0.18 * g * np.clip(lum * 18, 0, 1))
        # resolved star field: the Milky Way's glow dissolves into individual stars, densest where it's brightest
        rs = np.random.default_rng(1000 + j)
        prob = np.clip(lum[..., 0] * 0.55, 0, 0.09) + 0.0012
        hit = rs.random(prob.shape, dtype=F) < prob
        k = int(hit.sum())
        if k:
            fl = np.minimum(0.012 * rs.random(k, dtype=F) ** (-1 / 1.7), 0.6)
            tint = np.where(rs.random(k) < 0.7, 0, 1)
            cols = np.array([[1.0, 0.88, 0.74], [0.82, 0.9, 1.0]], F)[tint]
            up[j:j + 128][hit] += fl[:, None] * cols

    log('stars')
    rng = np.random.default_rng(42)
    M = 3_500_000
    v = rng.normal(size=(M, 3)).astype(F); v /= np.linalg.norm(v, axis=1, keepdims=True)
    x, y, z = v[:, 0], v[:, 1], v[:, 2]
    _, tr, bandw = fields(x, y, z)
    keep = rng.random(M) < (0.16 + 0.84 * np.clip(bandw * 1.2, 0, 1))
    x, y, z, tr = x[keep], y[keep], z[keep], tr[keep]
    n = len(x)
    flux = (0.0035 * rng.random(n) ** (-1 / 1.4)).astype(F)
    flux = np.minimum(flux, 70)
    kind = rng.random(n)
    T = np.where(kind < 0.62, rng.uniform(3000, 5800, n), np.where(kind < 0.9, rng.uniform(5800, 9000, n), rng.uniform(10000, 28000, n)))
    col = blackbody(T) * tr * flux[:, None]
    uu = (np.arctan2(z, x) / (2 * np.pi) + 0.5) * W - 0.5
    vv = (1 - (np.arcsin(np.clip(y, -1, 1)) / np.pi + 0.5)) * H - 0.5
    faint = flux < 0.5
    fx, fy, fc = uu[faint], vv[faint], col[faint]
    x0 = np.floor(fx).astype(np.int64); y0 = np.floor(fy).astype(np.int64)
    ax = (fx - x0)[:, None]; ay = (fy - y0)[:, None]
    flat = up.reshape(-1, 3)
    for ox, oy, wt in ((0, 0, (1 - ax) * (1 - ay)), (1, 0, ax * (1 - ay)), (0, 1, (1 - ax) * ay), (1, 1, ax * ay)):
        xi = (x0 + ox) % W; yi = np.clip(y0 + oy, 0, H - 1)
        idx = yi * W + xi
        for c in range(3):
            np.add.at(flat[:, c], idx, (fc[:, c] * wt[:, 0]).astype(F))
    bi = np.where(~faint)[0]
    log(f'{n} stars, {len(bi)} bright')
    for i in bi:
        cx, cy, c, f = uu[i], vv[i], col[i] / flux[i], flux[i]
        lat = (0.5 - (cy + 0.5) / H) * np.pi
        sx = 1 / max(0.08, math.cos(lat))
        s = 0.55 + 0.45 * math.log1p(f)
        R = int(min(40, math.ceil(s * 5 + 2 + f ** 0.5 * 1.6)))
        ys = np.arange(int(cy) - R, int(cy) + R + 1); xs = np.arange(int(cx) - int(R * sx), int(cx) + int(R * sx) + 1)
        if len(xs) > 400: continue
        X, Y = np.meshgrid(xs, ys)
        ddx = (X - cx) / sx; ddy = Y - cy
        d2 = ddx * ddx + ddy * ddy
        k = f * (np.exp(-d2 / (2 * s * s)) / (2 * np.pi * s * s) * 1.0 + 0.012 * np.exp(-np.sqrt(d2) / (s * 2.2)))
        if f > 6:   # faint diffraction spikes on the brightest
            sp = 0.0016 * f * (np.exp(-np.abs(ddy) / 0.7) * np.exp(-np.abs(ddx) / (R * 0.35)) + np.exp(-np.abs(ddx) / 0.7) * np.exp(-np.abs(ddy) / (R * 0.35)))
            k = k + sp
        Yc = np.clip(Y, 0, H - 1); Xc = X % W
        up[Yc, Xc] += k[..., None] * c

    log('galaxies')
    for _ in range(90):
        gx, gy = rng.uniform(0, W), rng.uniform(H * 0.1, H * 0.9)
        a = rng.uniform(0, np.pi); e = rng.uniform(0.25, 1); s = rng.uniform(1.2, 4.5); f = rng.uniform(0.02, 0.09)
        R = int(s * 5)
        X, Y = np.meshgrid(np.arange(int(gx) - R, int(gx) + R + 1), np.arange(int(gy) - R, int(gy) + R + 1))
        dx, dy = X - gx, Y - gy
        px, py = dx * math.cos(a) + dy * math.sin(a), (-dx * math.sin(a) + dy * math.cos(a)) / e
        r = np.sqrt(px * px + py * py)
        k = f * (np.exp(-r / (s * 0.35)) * 1.5 + np.exp(-r / s) * 0.4)
        up[np.clip(Y, 0, H - 1), X % W] += k[..., None] * np.array([1.0, 0.9, 0.78], F)

    log('tonemap + encode')
    img = np.empty((H, W, 3), np.uint8)
    rng2 = np.random.default_rng(5)
    for j in range(0, H, 256):
        t = tonemap(up[j:j + 256] * 0.95)
        t = t * 255 + rng2.random(t.shape, dtype=F) - 0.5
        img[j:j + 256] = np.clip(t, 0, 255).astype(np.uint8)
    del up
    im = Image.fromarray(img, 'RGB')
    im.save(os.path.join(OUT, 'sky-8k.webp'), quality=92, method=6)
    log('sky-8k.webp', os.path.getsize(os.path.join(OUT, 'sky-8k.webp')) // 1024, 'KB')
    im4 = im.resize((W // 2, H // 2), Image.LANCZOS)
    im4.save(os.path.join(OUT, 'sky-4k.webp'), quality=92, method=6)
    log('sky-4k.webp', os.path.getsize(os.path.join(OUT, 'sky-4k.webp')) // 1024, 'KB')
    # preview crop of what the phone sees (front, around the black hole) for quick review
    cx, cy = int(W * 0.25), int(H * 0.5 - H * 16 / 180)
    im.crop((cx - 700, cy - 1500, cx + 700, cy + 1200)).resize((700, 1350)).save(os.path.join(OUT, '..', '..', '..', 'scripts', '.sky-preview.png'))


# ---------------------------------------------------------------- accretion disk
def bake_disk(W=2048, H=512):
    log('disk')
    th = (np.arange(W, dtype=F) + 0.5) / W * 2 * np.pi
    r = 1 - (np.arange(H, dtype=F) + 0.5) / H          # row 0 = outer edge (v=1), last row = inner (v=0)
    TH, Rr = np.meshgrid(th, r)
    c, s = np.cos(TH), np.sin(TH)
    n1, n2, n3, n4 = Perlin(501), Perlin(502), Perlin(503), Perlin(504)
    warp = fbm(n4, c * 2, s * 2, Rr * 6, 3) * 0.06
    R2 = Rr + warp
    dens = fbm(n1, c * 3.0, s * 3.0, R2 * 26, 6) * 0.5 + 0.5
    rings = fbm(n1, c * 0.3, s * 0.3, R2 * 70, 3) * 0.5 + 0.5
    dens = np.clip(dens * (0.55 + 0.8 * rings), 0, 1)
    fil = ridged(n2, c * 7, s * 7, R2 * 90, 4) ** 3
    hot = smooth(0.18, 0.55, fbm(n3, c * 9, s * 9, R2 * 34, 4))
    img = np.stack([dens, np.clip(fil, 0, 1), np.clip(hot, 0, 1)], -1)
    img = np.clip(img * 255 + np.random.default_rng(3).random(img.shape) - 0.5, 0, 255).astype(np.uint8)
    Image.fromarray(img, 'RGB').save(os.path.join(OUT, 'disk.png'), optimize=True)
    log('disk.png', os.path.getsize(os.path.join(OUT, 'disk.png')) // 1024, 'KB')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    what = sys.argv[1:] or ['disk', 'sky']
    if 'disk' in what: bake_disk()
    if 'sky' in what: bake_sky(int(os.environ.get('VV_SKY_W', 8192)))
    log('done ->', OUT)
