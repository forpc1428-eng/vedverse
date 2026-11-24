// Vedverse — the universe (three.js)
// A ray-traced Schwarzschild black hole: real light bending (photons integrated through curved
// space), a Doppler-beamed, gravitationally redshifted accretion disk, an Einstein ring, and a
// gravitationally lensed sky. The sky and the disk plasma are high-resolution textures baked
// offline (scripts/bake-space.py) and stored in the app, so per frame the GPU only samples images.
import * as THREE from '../vendor/three.module.js';

THREE.ColorManagement.enabled = false;

const ease = {
  inOutQuart: t => t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  outExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  outCubic: t => 1 - Math.pow(1 - t, 3),
};
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));

const RS = 0.27;          // Schwarzschild radius in the anchor group's local units
const R0 = 14.0;          // ray-marching sphere (in Rs)
const ASSET_V = '4';      // bump when re-baking textures so webviews never show a stale cached sky

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(255,255,255,.35)'); gr.addColorStop(0.45, 'rgba(255,255,255,.05)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// Approximate blackbody colour (display-ish RGB, max channel 1). T in Kelvin.
function blackbody(T) {
  const t = T / 100;
  const r = t <= 66 ? 1 : Math.min(1, Math.max(0, 1.29293618606 * Math.pow(t - 60, -0.1332047592)));
  const g = t <= 66 ? Math.min(1, Math.max(0, 0.39008157876 * Math.log(t) - 0.63184144378)) : Math.min(1, Math.max(0, 1.12989086089 * Math.pow(t - 60, -0.0755148492)));
  const b = t >= 66 ? 1 : t <= 19 ? 0 : Math.min(1, Math.max(0, 0.54320678911 * Math.log(t - 10) - 1.19625408914));
  return new THREE.Color(r, g, b);
}

const GLSL_COMMON = /* glsl */`
uniform mat4 uInvProj, uCamWorld;
uniform vec3 uCamPos, uBH;
uniform mat3 uDiskBasis, uSkyRot;
uniform float uRs, uOn;
uniform sampler2D uSky;
varying vec2 vUv;
#define R0 ${R0.toFixed(1)}
vec3 viewRay(vec2 uv){ vec4 p = uInvProj * vec4(uv * 2.0 - 1.0, 1.0, 1.0); return normalize(mat3(uCamWorld) * normalize(p.xyz / p.w)); }
vec3 skyCol(vec3 d){ d = uSkyRot * d; return textureLod(uSky, vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5), 0.0).rgb; }
// weak-field Schwarzschild light deflection (Rs = 1), with 2nd/3rd order terms so it meets the ray-marched region seamlessly
float deflect(float b){ return 2.0 / b + 2.945 / (b * b) + 5.333 / (b * b * b); }
`;
const VERT_FS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const BH_FRAG = GLSL_COMMON + /* glsl */`
#define RIN 3.0
#define ROUT 12.0
uniform sampler2D uDisk;
uniform float uTime, uTemp, uDanger, uPulse, uSat, uBright, uTintAmt, uSpin;
uniform vec3 uTint;

vec3 blackbody(float T){
  float t = T / 100.0; vec3 c;
  c.r = t <= 66.0 ? 1.0 : clamp(1.29293618606 * pow(t - 60.0, -0.1332047592), 0.0, 1.0);
  c.g = t <= 66.0 ? clamp(0.39008157876 * log(t) - 0.63184144378, 0.0, 1.0) : clamp(1.12989086089 * pow(t - 60.0, -0.0755148492), 0.0, 1.0);
  c.b = t >= 66.0 ? 1.0 : (t <= 19.0 ? 0.0 : clamp(0.54320678911 * log(t - 10.0) - 1.19625408914, 0.0, 1.0));
  return pow(c, vec3(2.2));
}

// emission + opacity where the photon crosses the disk plane at c (disk frame, Rs units)
vec4 diskSample(vec3 c, float rc, vec3 v){
  float ang = atan(c.z, c.x);
  float vv = clamp((rc - RIN) / (ROUT - RIN), 0.0, 1.0);
  // Keplerian shear, hidden with two-phase flow blending so it never winds up
  float om = pow(rc, -1.5) * 2.4 * uSpin;
  float P = 7.0;
  float p1 = fract(uTime / P), p2 = fract(uTime / P + 0.5);
  float u0 = ang * 0.15915494 - uTime * 0.003;
  vec3 t1 = textureLod(uDisk, vec2(u0 - om * p1 * P * 0.15915494, vv), 0.0).rgb;
  vec3 t2 = textureLod(uDisk, vec2(u0 - om * p2 * P * 0.15915494 + 0.37, vv), 0.0).rgb;
  vec3 tx = mix(t1, t2, abs(2.0 * p1 - 1.0));
  float dens = tx.r * 0.8 + tx.g * 0.6;
  dens = dens * dens;
  float edge = smoothstep(RIN * 0.92, RIN + 0.45, rc) * smoothstep(ROUT, ROUT - 5.5, rc);
  // relativistic Doppler beaming + gravitational redshift
  vec3 velDir = normalize(vec3(-c.z, 0.0, c.x));
  float beta = clamp(sqrt(0.5 / max(rc - 1.0, 0.5)), 0.0, 0.62);
  float cosT = dot(velDir, -normalize(v));
  float g = sqrt(1.0 - beta * beta) / (1.0 - beta * cosT) * sqrt(max(1.0 - 1.5 / rc, 0.05));
  float beam = mix(1.0, pow(g, 3.5), 0.72);
  float flick = 1.0 + uDanger * 0.45 * sin(uTime * 19.0 + ang * 6.0 + rc * 3.0) * tx.b;
  float temp = uTemp * pow(RIN / rc, 0.62) * (1.0 - 0.32 * uDanger);
  vec3 col = blackbody(temp * clamp(g, 0.45, 1.7));
  col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, uSat);
  col = mix(col, dot(col, vec3(0.2126, 0.7152, 0.0722)) * uTint * 1.7, uTintAmt);   // theme colour of the disk light (the hole itself is untouched)
  float I = pow(RIN / rc, 1.7) * edge * (0.22 + 1.7 * dens + 1.4 * tx.b * dens) * beam * flick * (1.0 + uPulse * 1.3) * uBright;
  float a = clamp(edge * (0.28 + 1.1 * dens), 0.0, 0.96);
  return vec4(col * I * 2.6 * a, a);
}

void main(){
  if (uOn < 0.5) { gl_FragColor = vec4(0.0); return; }
  vec3 ro = uDiskBasis * ((uCamPos - uBH) / uRs);
  vec3 rd = uDiskBasis * viewRay(vUv);
  float tca = -dot(ro, rd);
  vec3 q = ro + rd * tca; float b = length(q);
  if (tca <= 0.0 || b >= R0) { gl_FragColor = vec4(0.0); return; }
  vec3 p = ro + rd * (tca - sqrt(R0 * R0 - b * b));
  vec3 v = rd; float h2 = b * b;
  vec3 col = vec3(0.0); float trans = 1.0; bool cap = false;
  for (int i = 0; i < STEPS; i++) {
    float r2 = dot(p, p); float r = sqrt(r2);
    float dt = clamp(STEP_K * r, 0.03, 1.6);
    vec3 v2 = v - 1.5 * h2 * p / (r2 * r2 * r) * dt;
    vec3 p2 = p + v2 * dt;
    if (p.y * p2.y < 0.0) {
      vec3 c = mix(p, p2, p.y / (p.y - p2.y)); float rc = length(c.xz);
      if (rc > RIN * 0.9 && rc < ROUT) { vec4 e = diskSample(c, rc, v2); col += trans * e.rgb; trans *= 1.0 - e.a; }
    }
    p = p2; v = v2;
    if (dot(p, p) < 1.0) { cap = true; break; }
    if (r > R0 && dot(p, v) > 0.0) break;
    if (trans < 0.01) break;
  }
  vec3 sky = vec3(0.0);
  if (!cap && trans > 0.01) {
    vec3 vn = normalize(v);
    vec3 perp = p - vn * dot(p, vn); float bo = max(length(perp), 1e-3);
    float extra = deflect(b) * (1.0 - sqrt(max(0.0, 1.0 - h2 / (R0 * R0))));
    vn = normalize(vn - perp / bo * extra);
    sky = skyCol(transpose(uDiskBasis) * vn);
  }
  vec3 disk = pow(1.0 - exp(-col * 1.5), vec3(1.0 / 2.2));
  gl_FragColor = vec4(1.0 - (1.0 - sky * trans) * (1.0 - disk), 1.0);
}`;

const COMP_FRAG = GLSL_COMMON + /* glsl */`
uniform sampler2D tBH;
uniform float uTime, uGrain, uFlash, uPulse, uGlow, uVig;
uniform vec3 uGlowCol;
void main(){
  vec3 rdw = viewRay(vUv);
  float b = 1e4, w = 0.0; vec3 q = vec3(1e4);
  if (uOn > 0.5) {
    vec3 ro = uDiskBasis * ((uCamPos - uBH) / uRs); vec3 rd = uDiskBasis * rdw;
    float tca = -dot(ro, rd);
    if (tca > 0.0) {
      q = ro + rd * tca; b = length(q);
      w = smoothstep(R0, R0 - 1.0, b);
      if (w < 1.0) rdw = transpose(uDiskBasis) * normalize(rd - q / b * deflect(max(b, 2.7)));
    }
  }
  vec3 col = w < 1.0 ? skyCol(rdw) : vec3(0.0);
  if (w > 0.0) col = mix(col, texture2D(tBH, vUv).rgb, w);
  if (uOn > 0.5 && b < 200.0) {
    float x = max(b - 2.6, 0.0);
    float g = exp(-x * 0.42) * 0.13 + exp(-x * 1.9) * 0.30;
    float flare = exp(-abs(q.y) * 1.5) * exp(-length(q.xz) / 16.0) * 0.07;
    col = 1.0 - (1.0 - col) * exp(-uGlowCol * (g + flare) * (1.0 + uPulse * 1.4) * uGlow);
  }
  col = 1.0 - (1.0 - col) * exp(-vec3(1.0, 0.9, 0.78) * uFlash * 0.6);
  vec2 vv = vUv - 0.5; col *= 1.0 - uVig * pow(dot(vv, vv) * 2.0, 1.5);
  float n = fract(sin(dot(gl_FragCoord.xy + fract(uTime * 7.31) * vec2(91.7, 37.3), vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}`;

export class Universe {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = Object.assign({ quality: 'auto', particles: 1, parallax: true, creature: true, grain: true }, opts);
    const q = this.q = this.resolveQuality(this.opts.quality);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false, depth: true });
    this.renderer.setPixelRatio(q.dpr);
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.autoClear = false;
    this.renderer.debug.checkShaderErrors = false;   // no synchronous shader-log reads (they stall the main thread for seconds on phones)
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1000);
    this.camera.position.set(0, 0.3, 9);
    this.timer = new THREE.Timer();
    this.t = 0;
    this.state = { mode: 'home', health: 1, remaining: 1, warp: 0, pulse: 0, gx: 0, gy: 0, px: 0, py: 0, danger: 0 };
    this.target = { cam: new THREE.Vector3(0, 0.3, 9), look: new THREE.Vector3(0, 0.6, 0), cPos: new THREE.Vector3(0, 1.55, 0), cScale: 1, skyOpacity: 0, fov: 50 };
    this.look = this.target.look.clone();
    this.colors = { bg0: new THREE.Color('#020307'), bg1: new THREE.Color('#0b1020'), a1: new THREE.Color('#f2a144'), a2: new THREE.Color('#a9dcff'), a3: new THREE.Color('#ffd29a'), hot: new THREE.Color('#fff3dc') };
    this.temp = 6400; this.sat = 1; this.skyYaw = 0; this.skyPitch = 0;
    this.labelsCb = null;
    this.running = true;
    this.fpsAcc = []; this.adapted = 0; this._readyN = 0;

    this.buildBlackHole();
    this.buildStars();
    this.buildWarp();
    this.buildAnchor();
    this.buildFX();
    this.buildConstellation();

    this.onResize = () => this.resize();
    addEventListener('resize', this.onResize);
    this.bindParallax();
    this.resize();
    this.loop = this.loop.bind(this);
    this.timer.connect && this.timer.connect(document);
    // compile every shader in parallel off the main thread (KHR_parallel_shader_compile), then start drawing
    const R = this.renderer;
    const warm = R.compileAsync ? Promise.all([R.compileAsync(this.bhScene, this.quadCam), R.compileAsync(this.compScene, this.quadCam), R.compileAsync(this.scene, this.camera)]) : Promise.resolve();
    this.ready = Promise.race([warm.catch(() => {}), new Promise(r => setTimeout(r, 6000))]).then(() => R.setAnimationLoop(this.loop));
    document.addEventListener('visibilitychange', () => { this.running = !document.hidden; });
  }

  resolveQuality(qs) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 4;
    if (qs === 'auto') qs = cores >= 8 && mem >= 6 ? 'high' : cores >= 6 ? 'med' : 'low';
    return {
      low: { name: 'low', dpr: Math.min(dpr, 1.2), rt: 0.5, steps: 40, k: 0.15, stars: 3000, sky: 'lo' },
      med: { name: 'med', dpr: Math.min(dpr, 1.45), rt: 0.5, steps: 50, k: 0.12, stars: 5000, sky: 'lo' },
      high: { name: 'high', dpr: Math.min(dpr, 1.75), rt: 0.55, steps: 64, k: 0.1, stars: 8000, sky: mem >= 6 ? 'hi' : 'lo' },
    }[qs];
  }

  /* ---------------- Black hole: ray-marched pass + full-res composite ---------------- */
  buildBlackHole() {
    const black = new THREE.DataTexture(new Uint8Array([2, 3, 7, 255]), 1, 1); black.needsUpdate = true;
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.bhRT = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
    const shared = {
      uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
      uBH: { value: new THREE.Vector3() }, uDiskBasis: { value: new THREE.Matrix3() }, uSkyRot: { value: new THREE.Matrix3() },
      uRs: { value: 0.1 }, uOn: { value: 1 }, uSky: { value: black }, uTime: { value: 0 }, uPulse: { value: 0 },
    };
    this.U = shared;
    this.bhMat = new THREE.ShaderMaterial({
      defines: { STEPS: this.q.steps, STEP_K: this.q.k.toFixed(3) },
      uniforms: Object.assign({}, shared, { uDisk: { value: black }, uTemp: { value: this.temp }, uDanger: { value: 0 }, uSat: { value: 1 }, uBright: { value: 1 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uTintAmt: { value: 0 }, uSpin: { value: 1 } }),
      vertexShader: VERT_FS, fragmentShader: BH_FRAG, depthTest: false, depthWrite: false,
    });
    this.compMat = new THREE.ShaderMaterial({
      uniforms: Object.assign({}, shared, { tBH: { value: this.bhRT.texture }, uGrain: { value: 0.028 }, uFlash: { value: 0 }, uGlow: { value: 1 }, uGlowCol: { value: new THREE.Vector3(1, 0.7, 0.4) }, uVig: { value: 0.42 } }),
      vertexShader: VERT_FS, fragmentShader: COMP_FRAG, depthTest: false, depthWrite: false,
    });
    const quad = new THREE.PlaneGeometry(2, 2);
    this.bhScene = new THREE.Scene(); this.bhScene.add(new THREE.Mesh(quad, this.bhMat));
    this.compScene = new THREE.Scene(); this.compScene.add(new THREE.Mesh(quad, this.compMat));
    this.diskBasis = { f: new THREE.Vector3(0, 0, 1), m4: new THREE.Matrix4(), X: new THREE.Vector3(), Y: new THREE.Vector3(), Z: new THREE.Vector3() };
    this.skyEuler = new THREE.Euler(0, 0, 0, 'YXZ'); this.skyM4 = new THREE.Matrix4();

    // textures live in the app — decode off the main thread, upload once
    const maxTex = this.renderer.capabilities.maxTextureSize || 4096;
    const hi = this.q.sky === 'hi' && maxTex >= 8192;
    // 4K sky first (tiny, instant); on capable phones the 8K swaps in silently once the app is idle
    const setSky = t => {
      t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
      const old = this.U.uSky.value; this.U.uSky.value = t; this.skyReady = true;
      if (old && old !== t && old.dispose) old.dispose();
    };
    this.loadTex('assets/space/sky-4k.webp?v=' + ASSET_V, t => {
      setSky(t);
      if (hi) {
        const later = () => this.loadTex('assets/space/sky-8k.webp?v=' + ASSET_V, setSky);
        setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(later, { timeout: 4000 }) : later()), 3500);
      }
    });
    this.loadTex('assets/space/disk.png?v=' + ASSET_V, t => {
      t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
      this.bhMat.uniforms.uDisk.value = t;
    });
  }
  loadTex(url, cb) {
    const done = (img, isBitmap) => {
      const t = new THREE.Texture(img);
      t.flipY = !isBitmap; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
      t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
      this.renderer.initTexture && this.renderer.initTexture(t);
      cb(t);
    };
    if ('createImageBitmap' in window) {
      fetch(url).then(r => r.blob()).then(b => createImageBitmap(b, { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))
        .then(bmp => done(bmp, true))
        .catch(() => new THREE.ImageLoader().load(url, img => done(img, false)));
    } else new THREE.ImageLoader().load(url, img => done(img, false));
  }

  /* ---------------- Stars: crisp foreground layer, gravitationally lensed in the vertex shader ---------------- */
  buildStars() {
    const N = Math.round(this.q.stars * this.opts.particles);
    const pos = new Float32Array(N * 3), size = new Float32Array(N), phase = new Float32Array(N), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 40 + Math.pow(Math.random(), 0.7) * 120;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph); pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const f = Math.min(9, 0.5 * Math.pow(Math.random(), -0.55));
      size[i] = 0.7 + Math.sqrt(f) * 0.9;
      phase[i] = Math.random();
      const k = Math.random();
      const T = k < 0.6 ? 3200 + Math.random() * 2800 : k < 0.9 ? 6000 + Math.random() * 3500 : 10000 + Math.random() * 18000;
      const c = blackbody(T); const m = Math.min(1, 0.35 + f * 0.12);
      col[i * 3] = c.r * m; col[i * 3 + 1] = c.g * m; col[i * 3 + 2] = c.b * m;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    this.lens = { uBHView: { value: new THREE.Vector3(0, 0, -9) }, uThetaE: { value: 0.1 }, uShadow: { value: 0.03 } };
    this.starMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: Object.assign({ uTime: { value: 0 }, uPR: { value: this.q.dpr }, uWarp: { value: 0 } }, this.lens),
      vertexShader: /* glsl */`attribute float aSize; attribute float aPhase; attribute vec3 aColor;
        uniform float uTime, uPR, uWarp, uThetaE, uShadow; uniform vec3 uBHView; varying vec3 vC; varying float vA;
        void main(){
          vec3 sp = (modelViewMatrix * vec4(position, 1.0)).xyz;
          float ds = length(sp), dl = length(uBHView); vec3 sd = sp / ds, ld = uBHView / dl;
          float cb = dot(sd, ld), amp = 1.0;
          if (ds > dl && cb > 0.0 && uThetaE > 0.0) {
            float beta = acos(clamp(cb, -1.0, 1.0));
            float tE = uThetaE * sqrt(max(0.0, 1.0 - dl / ds));
            float th = 0.5 * (beta + sqrt(beta * beta + 4.0 * tE * tE));
            vec3 pp = sd - ld * cb; float pl = length(pp);
            if (pl > 1e-5) { sd = ld * cos(th) + pp / pl * sin(th); sp = sd * ds; }
            float u = beta / max(tE, 1e-4);
            amp = clamp((u * u + 2.0) / (u * sqrt(u * u + 4.0)), 1.0, 5.0);
          }
          gl_Position = projectionMatrix * vec4(sp, 1.0);
          float tw = 0.9 + 0.1 * sin(uTime * (0.4 + aPhase * 1.5) + aPhase * 40.0);
          gl_PointSize = aSize * uPR * (1.0 + uWarp * 1.5) * min(2.0, sqrt(amp));
          vC = aColor * min(amp, 3.0); vA = tw;
        }`,
      fragmentShader: /* glsl */`varying vec3 vC; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c);
        float a = exp(-d * d * 28.0); float core = exp(-d * d * 120.0);
        float spike = (exp(-abs(c.x) * 60.0) * exp(-abs(c.y) * 7.0) + exp(-abs(c.y) * 60.0) * exp(-abs(c.x) * 7.0)) * 0.25;
        gl_FragColor = vec4(vC * (a * 0.8 + spike) + vec3(core) * dot(vC, vec3(0.33)), (a + spike) * vA); }`,
    });
    this.stars = new THREE.Points(g, this.starMat);
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    // near drifting interstellar dust (parallax depth)
    const M = Math.round(160 * this.opts.particles);
    const dp = new Float32Array(M * 3), ds = new Float32Array(M);
    for (let i = 0; i < M; i++) { dp[i * 3] = (Math.random() - .5) * 16; dp[i * 3 + 1] = (Math.random() - .5) * 18; dp[i * 3 + 2] = (Math.random() - .5) * 10; ds[i] = Math.random(); }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.setAttribute('aSeed', new THREE.BufferAttribute(ds, 1));
    this.dustMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPR: { value: this.q.dpr }, uCol: { value: new THREE.Color('#c9d6ea') } },
      vertexShader: `attribute float aSeed; uniform float uTime,uPR; varying float vA; void main(){ vec3 p=position; p.y=mod(p.y+uTime*(0.03+aSeed*0.05)+9.0,18.0)-9.0; p.x+=sin(uTime*0.12+aSeed*20.0)*0.3;
        vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=(1.0+aSeed*2.2)*uPR*(9.0/-mv.z); vA=0.12+0.25*aSeed; }`,
      fragmentShader: `uniform vec3 uCol; varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float a=exp(-d*d*18.0); gl_FragColor=vec4(uCol,a*vA*0.5);} `,
    });
    this.dust = new THREE.Points(dg, this.dustMat);
    this.scene.add(this.dust);
  }

  /* ---------------- Warp streaks (intro + big payments) ---------------- */
  buildWarp() {
    const N = 700; const pos = new Float32Array(N * 6), end = new Float32Array(N * 2), seed = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2, r = 1.5 + Math.random() * 22, z = -Math.random() * 220 + 20;
      const x = Math.cos(a) * r, y = Math.sin(a) * r, s = Math.random();
      pos.set([x, y, z, x, y, z], i * 6); end.set([0, 1], i * 2); seed.set([s, s], i * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.warpMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uSpeed: { value: 0 } },
      vertexShader: `attribute float aEnd; attribute float aSeed; uniform float uSpeed; varying float vA; varying float vS;
        void main(){ vec3 p=position; p.z+=aEnd*uSpeed*(4.0+aSeed*10.0); vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv; vA=aEnd; vS=aSeed; }`,
      fragmentShader: `uniform float uSpeed; varying float vA; varying float vS; void main(){ vec3 c=mix(vec3(0.75,0.85,1.0),vec3(1.0,0.9,0.78),vS); gl_FragColor=vec4(c,clamp(uSpeed*0.1,0.0,0.75)*(0.2+vA*0.8)); }`,
    });
    this.warp = new THREE.LineSegments(g, this.warpMat);
    this.warp.frustumCulled = false;
    this.warp.visible = false;
    this.scene.add(this.warp);
  }

  /* ---------------- Anchor: the black hole's position/scale + budget moons ---------------- */
  buildAnchor() {
    const G = this.creature = new THREE.Group();
    this.scene.add(G);
    this.diskGroup = new THREE.Group(); G.add(this.diskGroup);
    // budget moons — every one is a slice of what you have left; lit by the accretion disk
    this.MAXM = 36;
    this.moonMat = new THREE.ShaderMaterial({
      uniforms: { uLight: { value: new THREE.Vector3(1, 0.7, 0.4) }, uBHView: this.lens.uBHView, uShadow: this.lens.uShadow },
      vertexShader: /* glsl */`varying vec3 vN; varying vec3 vV; varying vec3 vC; varying vec3 vL;
        uniform vec3 uBHView;
        void main(){
          vec4 wp = instanceMatrix * vec4(position, 1.0);
          vec4 mv = modelViewMatrix * wp; vV = mv.xyz;
          vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
          vec4 cv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          vL = normalize(uBHView - cv.xyz);
          #ifdef USE_INSTANCING_COLOR
            vC = instanceColor;
          #else
            vC = vec3(0.8);
          #endif
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`uniform vec3 uLight, uBHView; uniform float uShadow; varying vec3 vN; varying vec3 vV; varying vec3 vC; varying vec3 vL;
        void main(){
          if (length(vV) > length(uBHView) && acos(clamp(dot(normalize(vV), normalize(uBHView)), -1.0, 1.0)) < uShadow * 1.12) discard;
          vec3 n = normalize(vN), v = normalize(-vV);
          float dif = max(dot(n, vL), 0.0);
          float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
          // hot debris lit by the disk: never a dark hole, the night side still glows faintly from tidal heating
          vec3 hot = mix(vC, uLight, 0.55);
          vec3 c = hot * (0.55 + dif * 1.1) + uLight * rim * (0.4 + 0.6 * dif);
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    this.marbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 20, 14), this.moonMat, this.MAXM);
    this.marbleData = [];
    for (let i = 0; i < this.MAXM; i++) {
      const ring = i % 3;
      this.marbleData.push({ ring, r: (8.2 + ring * 1.3 + Math.random() * 0.8) * RS, a: Math.random() * Math.PI * 2, s: (0.22 + Math.random() * 0.12) / (1 + ring * 0.35), inc: (Math.random() - 0.5) * 0.32, node: Math.random() * Math.PI * 2, sz: 0.55 + Math.random() * 0.75, show: 1 });
    }
    this.paintMoons();
    this.marbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.diskGroup.add(this.marbles);
    const tex = glowTexture();
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.MAXM * 3), 3));
    this.marbleGlow = new THREE.Points(mg, new THREE.PointsMaterial({ map: tex, size: 0.22, color: this.colors.a1, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.22 }));
    this.diskGroup.add(this.marbleGlow);
    this.tmpM = new THREE.Matrix4(); this.tmpV = new THREE.Vector3(); this.tmpQ = new THREE.Quaternion(); this.tmpS = new THREE.Vector3();
    G.position.copy(this.target.cPos);
  }
  paintMoons() {
    const base = [new THREE.Color('#b9b2a6'), new THREE.Color('#8f9aa8'), new THREE.Color('#c9a27e')];
    for (let i = 0; i < this.MAXM; i++) {
      const c = base[i % 3].clone().lerp([this.colors.a2, this.colors.a1, this.colors.a3][i % 3], 0.25);
      this.marbles.setColorAt(i, c);
    }
    if (this.marbles.instanceColor) this.marbles.instanceColor.needsUpdate = true;
  }

  /* ---------------- FX: shockwaves, plasma bursts, polar jets ---------------- */
  buildFX() {
    this.waves = [];
    this.waveMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color('#ffd9a8') } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `uniform float uT; uniform vec3 uC; varying vec2 vUv; void main(){ float r=length(vUv*2.0-1.0); float w=exp(-pow((r-0.8)*16.0,2.0)); float inner=smoothstep(0.8,0.0,r)*0.05; gl_FragColor=vec4(mix(uC,vec3(1.0),w*0.3),(w*0.45+inner)*(1.0-uT)*(1.0-uT));} `,
    });
    const N = 1200;
    const g = new THREE.BufferGeometry();
    this.burstPos = new Float32Array(N * 3); this.burstVel = new Float32Array(N * 3); this.burstLife = new Float32Array(N); this.burstCol = new Float32Array(N * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.burstPos, 3));
    g.setAttribute('aLife', new THREE.BufferAttribute(this.burstLife, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.burstCol, 3));
    this.burstMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uPR: { value: this.q.dpr } },
      vertexShader: `attribute float aLife; attribute vec3 aColor; uniform float uPR; varying float vL; varying vec3 vC; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=max(0.0,aLife)*uPR*(16.0/-mv.z); vL=aLife; vC=aColor; }`,
      fragmentShader: `varying float vL; varying vec3 vC; void main(){ float d=length(gl_PointCoord-0.5); float a=exp(-d*d*20.0); gl_FragColor=vec4(mix(vC,vec3(1.0),exp(-d*d*90.0)),a*clamp(vL,0.0,1.0)*0.9); }`,
    });
    this.burst = new THREE.Points(g, this.burstMat);
    this.burst.frustumCulled = false;
    this.burstN = N; this.burstI = 0;
    this.scene.add(this.burst);
  }

  /* ---------------- Constellation of payees ---------------- */
  buildConstellation() {
    this.sky = new THREE.Group();
    this.sky.position.set(0, 0.8, -1);
    this.scene.add(this.sky);
    this.skyNodes = [];
    this.skyMatP = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPR: { value: this.q.dpr }, uO: { value: 0 } },
      vertexShader: `attribute float aSize; attribute vec3 aColor; uniform float uTime,uPR,uO; varying vec3 vC; varying float vA; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=aSize*uPR*(26.0/-mv.z)*(0.94+0.06*sin(uTime*1.5+position.x*3.0)); vC=aColor; vA=uO; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c); float a=exp(-d*d*22.0); float core=exp(-d*d*160.0); float rays=(exp(-abs(c.x)*55.0)*exp(-abs(c.y)*6.0)+exp(-abs(c.y)*55.0)*exp(-abs(c.x)*6.0))*0.5; gl_FragColor=vec4(vC*a*0.8+vec3(core)+vC*rays*0.6,(a+rays)*vA);} `,
    });
    this.skyLineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.skyPoints = new THREE.Points(new THREE.BufferGeometry(), this.skyMatP);
    this.skyLines = new THREE.LineSegments(new THREE.BufferGeometry(), this.skyLineMat);
    this.sky.add(this.skyPoints, this.skyLines);
  }

  setConstellation(nodes) {
    const n = nodes.length;
    const pos = new Float32Array(n * 3), size = new Float32Array(n), col = new Float32Array(n * 3);
    const maxW = Math.max(1, ...nodes.map(x => x.weight));
    const cats = [...new Set(nodes.map(x => x.cat))];
    this.skyNodes = nodes.map((nd, i) => {
      let h = 0; for (let k = 0; k < nd.key.length; k++) h = (h * 31 + nd.key.charCodeAt(k)) >>> 0;
      const ci = cats.indexOf(nd.cat);
      const base = (ci / Math.max(1, cats.length)) * Math.PI * 2;
      const ang = base + ((h % 1000) / 1000 - 0.5) * (Math.PI * 2 / Math.max(1, cats.length)) * 0.8;
      const rad = 2.2 + ((h >> 10) % 1000) / 1000 * 3.6;
      const y = (((h >> 20) % 1000) / 1000 - 0.5) * 6.5;
      const p = new THREE.Vector3(Math.cos(ang) * rad, y, Math.sin(ang) * rad * 0.6);
      pos.set([p.x, p.y, p.z], i * 3);
      size[i] = 7 + 18 * Math.sqrt(nd.weight / maxW);
      const c = new THREE.Color(nd.color); col.set([c.r, c.g, c.b], i * 3);
      return { ...nd, p };
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    this.skyPoints.geometry.dispose(); this.skyPoints.geometry = g;
    const lp = [];
    cats.forEach(c => {
      const group = this.skyNodes.filter(x => x.cat === c).sort((a, b) => b.weight - a.weight);
      for (let i = 1; i < group.length; i++) { const a = group[i - 1].p, b = group[i].p; lp.push(a.x, a.y, a.z, b.x, b.y, b.z); }
    });
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lp), 3));
    this.skyLines.geometry.dispose(); this.skyLines.geometry = lg;
  }

  /* ---------------- Public API ---------------- */
  setTheme(t) {
    this.colors.bg0.set(t.bg0); this.colors.bg1.set(t.bg1); this.colors.a1.set(t.a1); this.colors.a2.set(t.a2); this.colors.a3.set(t.a3); this.colors.hot.set(t.hot || '#fff3dc');
    this.temp = t.temp || 6400; this.sat = t.sat === undefined ? 1 : t.sat;
    this.skyYaw = t.yaw || 0; this.skyPitch = t.pitch || 0;
    this.bhMat.uniforms.uTemp.value = this.temp; this.bhMat.uniforms.uSat.value = this.sat;
    const gc = blackbody(this.temp * 0.8); const l = Math.max(gc.r, gc.g, gc.b);
    const s = this.sat; const lum = (gc.r + gc.g + gc.b) / 3;
    this.compMat.uniforms.uGlowCol.value.set(lerp(lum, gc.r, s) / l, lerp(lum, gc.g, s) / l, lerp(lum, gc.b, s) / l);
    const tint = t.tint ? new THREE.Color(t.tint) : null, ta = tint ? (t.tintAmt === undefined ? 0.78 : t.tintAmt) : 0;
    this.bhMat.uniforms.uTintAmt.value = ta;
    if (tint) { this.bhMat.uniforms.uTint.value.set(tint.r, tint.g, tint.b); const g = this.compMat.uniforms.uGlowCol.value, m = Math.max(tint.r, tint.g, tint.b); g.set(lerp(g.x, tint.r / m, ta), lerp(g.y, tint.g / m, ta), lerp(g.z, tint.b / m, ta)); }
    this.moonMat.uniforms.uLight.value.copy(this.compMat.uniforms.uGlowCol.value);
    this.marbleGlow.material.color.copy(this.colors.a1);
    this.paintMoons();
  }
  setLayout(l) { this.layout = l; this.bhMat.uniforms.uSpin.value = l.spin; this.mode(this.state.mode); }
  setHealth(h) { this.state.health = h; }
  setRemaining(f) { this.state.remaining = Math.max(0, Math.min(1, f)); }
  setWarp(v) { this.state.warp = Math.max(0, Math.min(1, v)); }
  pulse(s = 0.6) { this.state.pulse = Math.min(1.6, this.state.pulse + s); }
  setCreature(v) { this.opts.creature = v; this.U.uOn.value = v ? 1 : 0; this.creature.visible = v; }
  setParallax(v) { this.opts.parallax = v; }
  setGrain(v) { this.opts.grain = v; this.compMat.uniforms.uGrain.value = v ? 0.028 : 0.006; }
  onLabels(cb) { this.labelsCb = cb; }
  pause(v) { this.paused = v; }

  at(ndcX, ndcY, z, camZ = 9, lookY = 0.6) {
    const half = (camZ - z) * Math.tan(THREE.MathUtils.degToRad(this.target.fov / 2));
    return new THREE.Vector3(ndcX * half * (innerWidth / innerHeight), lookY + ndcY * half, z);
  }
  mode(m) {
    this.state.mode = m;
    const T = this.target;
    const pxPerUnit = (z) => innerHeight / 2 / ((9 - z) * Math.tan(THREE.MathUtils.degToRad(25)));
    // shadow radius on screen = frac × screen width (capped for tablets / desktop)
    const fit = (z, frac) => Math.min(innerWidth * frac, 70) / pxPerUnit(z) / (2.6 * RS);
    T.fov = 50; T.skyOpacity = 0; T.cam.set(0, 0.3, 9); T.look.set(0, 0.6, 0);
    switch (m) {
      case 'pay': T.cPos.copy(this.at(0, 0.8, -2)); T.cScale = fit(-2, 0.042); break;
      case 'sky': T.cam.set(0, 1.2, 14.5); T.look.set(0, 0.6, -1); T.cPos.set(0, 0.6, -1); T.cScale = 0.42; T.skyOpacity = 1; T.fov = 55; break;
      case 'side': T.cPos.copy(this.at(0.42, 0.72, -14)); T.cScale = fit(-14, 0.05); break;
      case 'receipt': T.cPos.copy(this.at(0, 0.78, -3)); T.cScale = fit(-3, 0.05); break;
      default: { const L = this.layout || {}; T.cPos.copy(this.at(L.x || 0, 0.6 + (L.y || 0), 0)); T.cScale = fit(0, 0.075) * (L.size || 1); }
    }
  }

  wave(color, at) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.waveMat.clone());
    m.material.uniforms.uC.value = new THREE.Color(color || this.colors.hot);
    m.position.copy(at || this.creature.position);
    m.lookAt(this.camera.position);
    m.userData.t = 0;
    this.scene.add(m); this.waves.push(m);
  }
  burstAt(at, n = 260, speed = 6, colors, axis) {
    const cs = (colors || [this.colors.a1, this.colors.hot, this.colors.a3, this.colors.a2]).map(c => c instanceof THREE.Color ? c : new THREE.Color(c));
    for (let k = 0; k < n; k++) {
      const i = this.burstI = (this.burstI + 1) % this.burstN;
      let vx, vy, vz;
      if (axis) {     // relativistic polar jet: tight cone along ±axis
        const sgn = k % 2 ? 1 : -1, sp = speed * (0.6 + Math.random() * 0.8), spread = 0.07;
        vx = (axis.x + (Math.random() - .5) * spread) * sp * sgn; vy = (axis.y + (Math.random() - .5) * spread) * sp * sgn; vz = (axis.z + (Math.random() - .5) * spread) * sp * sgn;
      } else {
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), v = speed * (0.3 + Math.random() * 0.9);
        vx = Math.sin(ph) * Math.cos(th) * v; vy = Math.cos(ph) * v; vz = Math.sin(ph) * Math.sin(th) * v;
      }
      this.burstPos.set([at.x, at.y, at.z], i * 3);
      this.burstVel.set([vx, vy, vz], i * 3);
      this.burstLife[i] = 0.8 + Math.random() * 1.2;
      const c = cs[k % cs.length]; this.burstCol.set([c.r, c.g, c.b], i * 3);
    }
  }
  supernova() {
    const at = this.creature.position.clone();
    this.pulse(1.4);
    this.wave(this.colors.hot, at); setTimeout(() => this.wave(this.colors.a1, at), 140);
    this.burstAt(at, 420, 9, [new THREE.Color('#cfe4ff'), new THREE.Color('#ffffff'), this.colors.a2], this.diskBasis.Y);
    this.burstAt(at, 180, 3.2);
    this.flash = 1;
  }
  feed() { this.pulse(0.9); this.burstAt(this.creature.position, 60, 1.8); }

  intro(duration = 3200) {
    return new Promise(res => {
      this.introT = 0; this.introD = duration / 1000; this.introRes = res;
      this.warp.visible = true;
      this.camera.position.set(0, 0.6, 120);
      this.creature.scale.setScalar(this.target.cScale);
    });
  }

  bindParallax() {
    addEventListener('pointermove', e => { this.state.px = (e.clientX / innerWidth - 0.5) * 2; this.state.py = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
    this.gyro = (e) => { if (e.gamma == null) return; this.state.gx = Math.max(-1, Math.min(1, e.gamma / 35)); this.state.gy = Math.max(-1, Math.min(1, (e.beta - 45) / 35)); };
    addEventListener('deviceorientation', this.gyro, { passive: true });
  }

  resize() {
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    this.sizeRT();
    this.mode(this.state.mode);
  }
  sizeRT() {
    const pr = this.renderer.getPixelRatio(), s = this.q.rt;
    this.bhRT.setSize(Math.max(4, Math.round(innerWidth * pr * s)), Math.max(4, Math.round(innerHeight * pr * s)));
  }

  updateDisk(t, dt) {
    // disk plane: nearly edge-on (~80°) to the viewer, gently precessing, so the lensed far side arcs over the hole
    const D = this.diskBasis, cam = this.camera, G = this.creature;
    const f = this.tmpV.copy(cam.position).sub(G.position).normalize();
    D.f.lerp(f, 1 - Math.exp(-1.2 * dt)).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const r = new THREE.Vector3().crossVectors(up, D.f).normalize();
    const u = new THREE.Vector3().crossVectors(D.f, r);
    const inc = THREE.MathUtils.degToRad(9 + 1.2 * Math.sin(t * 0.11)), roll = THREE.MathUtils.degToRad(-12 + 1.0 * Math.sin(t * 0.07));
    const n = u.clone().multiplyScalar(Math.cos(inc)).addScaledVector(D.f, Math.sin(inc));
    n.applyAxisAngle(D.f, roll).normalize();
    D.Y.copy(n); D.X.crossVectors(n, D.f).normalize(); D.Z.crossVectors(D.X, D.Y);
    const X = D.X, Y = D.Y, Z = D.Z;
    this.U.uDiskBasis.value.set(X.x, X.y, X.z, Y.x, Y.y, Y.z, Z.x, Z.y, Z.z);
    D.m4.makeBasis(X, Y, Z);
    this.diskGroup.quaternion.setFromRotationMatrix(D.m4);
  }

  // frame cap: 60 normally, 30 while lists scroll or when cards cover the scene (looks the same, half the work)
  setFps(n) { this.fpsCap = n; }
  loop(time) {
    if (!this.running || this.paused) { this.timer.update(time); return; }
    const cap = (this.introT !== undefined || this.state.warp > 0.02 || this.state.pulse > 0.15) ? 60 : (this.fpsCap == null ? 60 : this.fpsCap);
    if (cap === 0 && this._bhOnce) { this.timer.update(time); this._lastT = time; return; }   // frozen: the last frame stays on screen, zero GPU work
    if (cap < 60 && this._lastT && time - this._lastT < 1000 / cap - 4) return;
    this._lastT = time;
    this.timer.update(time);
    const dt = Math.max(0, Math.min(0.05, this.timer.getDelta()));   // never negative (clock hiccups) or huge (tab resume)
    this.t += dt; const t = this.t;
    const S = this.state, T = this.target, cam = this.camera, R = this.renderer;

    // adaptive quality — trade ray-march resolution first, then pixel ratio, to hold 55+ fps
    this.fpsAcc.push(dt); if (this.fpsAcc.length > 90) {
      const avg = this.fpsAcc.reduce((a, b) => a + b, 0) / this.fpsAcc.length; this.fpsAcc = [];
      if (avg > 1 / 45 * (60 / Math.max(24, cap)) && this.adapted < 5) {
        this.adapted++;
        if (this.adapted >= 2) document.documentElement.classList.add('lite');   // struggling phone: drop the remaining live blurs
        if (this.q.rt > 0.5) { this.q.rt = Math.max(0.5, this.q.rt * 0.85); this.sizeRT(); }   // floor keeps the hole crisp
        else if (R.getPixelRatio() > 1.1) { R.setPixelRatio(Math.max(1.1, R.getPixelRatio() * 0.88)); this.resize(); }
      }
    }

    S.pulse = damp(S.pulse, 0, 3.0, dt);
    S.danger = damp(S.danger, 1 - S.health, 2, dt);

    if (this.introT !== undefined) {
      this.introT += dt; const k = Math.min(1, this.introT / this.introD);
      const e = ease.inOutQuart(k);
      cam.position.set(Math.sin(k * 3) * 0.6 * (1 - k), lerp(0.6, T.cam.y, e), lerp(120, T.cam.z, e));
      const speed = Math.sin(Math.min(1, k * 1.15) * Math.PI) * 9;
      this.warpMat.uniforms.uSpeed.value = speed;
      this.starMat.uniforms.uWarp.value = speed / 9;
      if (k >= 0.7 && !this.introBoom) { this.introBoom = true; this.supernova(); }
      if (k >= 1) { const r = this.introRes; this.introT = undefined; this.warp.visible = false; this.warpMat.uniforms.uSpeed.value = 0; this.starMat.uniforms.uWarp.value = 0; r && r(); }
      cam.lookAt(0, 0.6, 0);
      if (cam.fov !== T.fov) { cam.fov = T.fov; cam.updateProjectionMatrix(); }
    } else {
      const pxx = this.opts.parallax ? (S.gx || S.px * 0.6) : 0, pyy = this.opts.parallax ? (S.gy || S.py * 0.6) : 0;
      const shake = S.danger > 0.6 ? (S.danger - 0.6) * 0.02 : 0;
      cam.position.x = damp(cam.position.x, T.cam.x + pxx * 0.9 + Math.sin(t * 37) * shake, 2.5, dt);
      cam.position.y = damp(cam.position.y, T.cam.y - pyy * 0.6 + Math.cos(t * 29) * shake, 2.5, dt);
      cam.position.z = damp(cam.position.z, T.cam.z - S.warp * 1.6, 2.2, dt);
      this.look.lerp(T.look, 1 - Math.exp(-3 * dt));
      cam.lookAt(this.look);
      const fov = T.fov + S.warp * 14 + S.pulse * 1.5;
      if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = damp(cam.fov, fov, 4, dt); cam.updateProjectionMatrix(); }
      this.warp.visible = S.warp > 0.02;
      if (this.warp.visible) this.warpMat.uniforms.uSpeed.value = S.warp * 4;
    }

    // black hole anchor
    const G = this.creature;
    G.position.x = damp(G.position.x, T.cPos.x, 2.4, dt);
    G.position.y = damp(G.position.y, T.cPos.y + Math.sin(t * 0.35) * 0.03, 2.4, dt);
    G.position.z = damp(G.position.z, T.cPos.z, 2.4, dt);
    if (this.introT === undefined) G.scale.setScalar(damp(G.scale.x, T.cScale * (1 + S.warp * 0.15), 3, dt));
    cam.updateMatrixWorld();
    this.updateDisk(t, dt);

    const U = this.U, rsW = RS * G.scale.x;
    U.uInvProj.value.copy(cam.projectionMatrixInverse); U.uCamWorld.value.copy(cam.matrixWorld); U.uCamPos.value.copy(cam.position);
    U.uBH.value.copy(G.position); U.uRs.value = rsW; U.uTime.value = t; U.uPulse.value = S.pulse;
    this.bhMat.uniforms.uDanger.value = S.danger;
    this.bhMat.uniforms.uBright.value = (0.75 + 0.35 * S.health) * (this.layout ? this.layout.bright : 1);
    this.skyEuler.set(this.skyPitch + (this.opts.parallax ? (S.gy || S.py) * 0.02 : 0), this.skyYaw + t * 0.0025 + (this.opts.parallax ? (S.gx || S.px) * 0.03 : 0), 0);
    this.skyM4.makeRotationFromEuler(this.skyEuler); U.uSkyRot.value.setFromMatrix4(this.skyM4);

    // lensing uniforms for the point stars & moon occlusion
    const bhv = this.lens.uBHView.value.copy(G.position).applyMatrix4(cam.matrixWorldInverse);
    const dl = Math.max(0.01, bhv.length());
    this.lens.uThetaE.value = this.opts.creature ? Math.sqrt(2 * rsW / dl) : 0;
    this.lens.uShadow.value = this.opts.creature ? 2.6 * rsW / dl : 0;

    // moons
    const visible = Math.round(this.MAXM * S.remaining);
    const gp = this.marbleGlow.geometry.attributes.position;
    for (let i = 0; i < this.MAXM; i++) {
      const m = this.marbleData[i];
      m.show = damp(m.show, i < visible ? 1 : 0, 3, dt);
      m.a += m.s * dt * (1 + S.pulse * 1.5 + S.warp * 2);
      const ca = Math.cos(m.a), sa = Math.sin(m.a);
      let x = ca * m.r, z = sa * m.r, y = 0;
      const ci = Math.cos(m.node), si = Math.sin(m.node);
      y = (x * ci + z * si) * Math.sin(m.inc);
      this.tmpV.set(x, y, z);
      const s = m.show * m.sz;
      this.tmpS.setScalar(Math.max(0.0001, s));
      this.tmpQ.identity();
      this.tmpM.compose(this.tmpV, this.tmpQ, this.tmpS);
      this.marbles.setMatrixAt(i, this.tmpM);
      if (m.show > 0.05) gp.setXYZ(i, x, y, z); else gp.setXYZ(i, 0, -999, 0);
    }
    this.marbles.instanceMatrix.needsUpdate = true; gp.needsUpdate = true;

    this.starMat.uniforms.uTime.value = t; this.dustMat.uniforms.uTime.value = t;
    this.stars.rotation.y = this.skyYaw * -1 + t * 0.0035;
    if (this.flash) { this.flash = damp(this.flash, 0, 3.5, dt); if (this.flash < 0.002) this.flash = 0; }
    this.compMat.uniforms.uFlash.value = this.flash || 0;

    // shockwaves
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i]; w.userData.t += dt / 1.4; const k = w.userData.t;
      w.scale.setScalar(G.scale.x * (1 + ease.outExpo(Math.min(1, k)) * 6)); w.material.uniforms.uT.value = Math.min(1, k); w.lookAt(cam.position);
      if (k >= 1) { this.scene.remove(w); w.geometry.dispose(); w.material.dispose(); this.waves.splice(i, 1); }
    }
    // plasma particles (no gravity in space — they coast and fade)
    let any = false;
    for (let i = 0; i < this.burstN; i++) {
      if (this.burstLife[i] <= 0) continue; any = true;
      this.burstLife[i] -= dt * 0.75;
      const k = Math.exp(-1.6 * dt);
      this.burstVel[i * 3] *= k; this.burstVel[i * 3 + 1] *= k; this.burstVel[i * 3 + 2] *= k;
      this.burstPos[i * 3] += this.burstVel[i * 3] * dt; this.burstPos[i * 3 + 1] += this.burstVel[i * 3 + 1] * dt; this.burstPos[i * 3 + 2] += this.burstVel[i * 3 + 2] * dt;
    }
    if (any || this._burstWas) { const a = this.burst.geometry.attributes; a.position.needsUpdate = true; a.aLife.needsUpdate = true; a.aColor.needsUpdate = true; }
    this._burstWas = any;

    // constellation
    const so = damp(this.skyMatP.uniforms.uO.value, T.skyOpacity, 3, dt);
    this.skyMatP.uniforms.uO.value = so; this.skyMatP.uniforms.uTime.value = t; this.skyLineMat.opacity = so * 0.22;
    this.sky.visible = so > 0.01;
    if (this.sky.visible) {
      this.sky.rotation.y += dt * 0.05 + (this.skySpin || 0) * dt; this.skySpin = damp(this.skySpin || 0, 0, 2, dt);
      if (this.labelsCb) {
        const out = []; const v = new THREE.Vector3();
        this.sky.updateMatrixWorld();
        this.skyNodes.forEach(nd => { v.copy(nd.p).applyMatrix4(this.sky.matrixWorld); const z = v.clone().applyMatrix4(cam.matrixWorldInverse).z; v.project(cam); out.push({ ...nd, x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, front: z < 0, depth: -z, o: so }); });
        this.labelsCb(out);
      }
    } else if (this.labelsCb && this._lblWas) this.labelsCb([]);
    this._lblWas = this.sky.visible;

    // render: ray-marched black hole (reduced res) → full-res sky + composite → scene on top
    // the ray-traced hole is re-traced every other frame (the disk drifts slowly; the composite stays 60 fps)
    this.bhFrame = (this.bhFrame || 0) + 1;
    const fast = this.introT !== undefined || S.warp > 0.02 || S.pulse > 0.2 || (this.fpsCap == null ? 60 : this.fpsCap) <= 30;
    if (this.opts.creature && (fast || this.bhFrame % 2 === 0 || !this._bhOnce)) { R.setRenderTarget(this.bhRT); R.render(this.bhScene, this.quadCam); this._bhOnce = true; }
    R.setRenderTarget(null);
    R.render(this.compScene, this.quadCam);
    R.clearDepth();
    R.render(this.scene, cam);
    if (!this._ready && this.skyReady && this.bhMat.uniforms.uDisk.value.image && ++this._readyN > 2) { this._ready = true; document.documentElement.classList.add('gl-ready'); }
  }
  spinSky(v) { this.skySpin = (this.skySpin || 0) + v; }
  dispose() { this.renderer.setAnimationLoop(null); removeEventListener('resize', this.onResize); this.renderer.dispose(); }
}
