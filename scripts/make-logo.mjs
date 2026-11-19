// Vedverse logo: a bold V wrapped in two tilted orbit rings (passing behind AND in front of it),
// a small planet riding the front ring, and starlight sparkles on deep-space black.
// Generates www/assets/icon.svg + every PNG the app/launcher/splash uses.
//   node scripts/make-logo.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const C = { a1: '#f2a144', a2: '#a9dcff', hot: '#ffd9a0' };

// bg: 'square' (full-bleed), 'none' (transparent), scale: content scale around the centre
export function logoSVG({ bg = 'square', scale = 1, stars = true, size = 1024 } = {}) {
  const k = scale, T = `translate(60 60) scale(${k}) translate(-60 -60)`;
  const spark = (x, y, s, o = 1) => `<path transform="translate(${x} ${y}) scale(${s})" opacity="${o}" d="M0-7 C.5-1.6 1.6-.5 7 0 C1.6 .5 .5 1.6 0 7 C-.5 1.6 -1.6 .5 -7 0 C-1.6-.5 -.5-1.6 0-7Z" fill="#fff"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 120 120">
<defs>
  <radialGradient id="bg" cx="50%" cy="44%" r="72%"><stop offset="0" stop-color="#121b36"/><stop offset=".55" stop-color="#070b18"/><stop offset="1" stop-color="#020307"/></radialGradient>
  <radialGradient id="gw" cx="50%" cy="58%" r="40%"><stop offset="0" stop-color="${C.a1}" stop-opacity=".42"/><stop offset=".6" stop-color="${C.a1}" stop-opacity=".08"/><stop offset="1" stop-color="${C.a1}" stop-opacity="0"/></radialGradient>
  <linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="${C.hot}"/><stop offset="1" stop-color="${C.a1}"/></linearGradient>
  <linearGradient id="vs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="r1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.a1}" stop-opacity="0"/><stop offset=".3" stop-color="${C.a1}" stop-opacity=".9"/><stop offset=".72" stop-color="${C.hot}"/><stop offset="1" stop-color="${C.a1}" stop-opacity=".15"/></linearGradient>
  <linearGradient id="r2" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${C.a2}" stop-opacity="0"/><stop offset=".35" stop-color="${C.a2}" stop-opacity=".85"/><stop offset=".75" stop-color="#ffffff" stop-opacity=".9"/><stop offset="1" stop-color="${C.a2}" stop-opacity=".1"/></linearGradient>
  <filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5"/></filter>
</defs>
${bg === 'square' ? '<rect width="120" height="120" fill="url(#bg)"/>' : ''}
<g transform="${T}">
  <rect x="10" y="10" width="100" height="100" fill="url(#gw)"/>
  ${stars ? `<g fill="#fff"><circle cx="18" cy="44" r=".6" opacity=".7"/><circle cx="104" cy="44" r=".5" opacity=".6"/><circle cx="34" cy="16" r=".45" opacity=".6"/><circle cx="76" cy="104" r=".55" opacity=".55"/><circle cx="12" cy="70" r=".4" opacity=".5"/><circle cx="108" cy="72" r=".45" opacity=".5"/><circle cx="48" cy="106" r=".4" opacity=".45"/><circle cx="66" cy="12" r=".5" opacity=".6"/></g>` : ''}
  <!-- rings, back halves (behind the V) -->
  <path d="M14 64 A46 12 0 0 1 106 64" transform="rotate(24 60 64)" fill="none" stroke="url(#r2)" stroke-width="1.4" opacity=".75"/>
  <path d="M10 62 A50 15 0 0 1 110 62" transform="rotate(-16 60 62)" fill="none" stroke="url(#r1)" stroke-width="2.3" opacity=".85"/>
  <!-- the V -->
  <path d="M27 33 H42.5 L60 72.5 L77.5 33 H93 L60 95 Z" fill="${C.a1}" opacity=".55" filter="url(#soft)"/>
  <path d="M27 33 H42.5 L60 72.5 L77.5 33 H93 L60 95 Z" fill="url(#v)"/>
  <path d="M29.5 34.6 H41.4 L60 76" fill="none" stroke="url(#vs)" stroke-width=".9" opacity=".8"/>
  <!-- rings, front halves (in front of the V) -->
  <path d="M14 64 A46 12 0 0 0 106 64" transform="rotate(24 60 64)" fill="none" stroke="url(#r2)" stroke-width="1.6" filter="url(#gl)"/>
  <path d="M10 62 A50 15 0 0 0 110 62" transform="rotate(-16 60 62)" fill="none" stroke="url(#r1)" stroke-width="2.6" filter="url(#gl)"/>
  <!-- planet riding the front ring -->
  <circle cx="99.5" cy="60.7" r="5.5" fill="${C.a2}" opacity=".25" filter="url(#soft)"/>
  <circle cx="99.5" cy="60.7" r="2.7" fill="#fff" filter="url(#gl)"/>
  ${stars ? spark(91, 21, 1.15) + spark(23, 25, .6, .9) + spark(102, 95, .5, .8) + spark(17, 92, .42, .7) : ''}
</g>
</svg>`;
}

const out = (p) => path.join(ROOT, p);
const png = (svg, file, w = 1024, h = w, extend) => {
  let s = sharp(Buffer.from(svg), { density: 384 }).resize(w, h);
  return s.png({ compressionLevel: 9 }).toFile(out(file));
};

if (process.argv[1] && process.argv[1].endsWith('make-logo.mjs')) {
  fs.writeFileSync(out('www/assets/icon.svg'), logoSVG({ size: 1024 }));
  await png(logoSVG(), 'www/assets/icon-1024.png', 1024);
  await png(logoSVG(), 'www/assets/icon-512.png', 512);
  await png(logoSVG(), 'assets/icon-only.png', 1024);
  // adaptive icon: the launcher masks to ~66% → keep the mark inside the safe zone
  await png(logoSVG({ bg: 'none', scale: 0.74, stars: false }), 'assets/icon-foreground.png', 1024);
  await png(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 120 120">${logoSVG().match(/<defs>[\s\S]*?<\/defs>/)[0]}<rect width="120" height="120" fill="url(#bg)"/><g fill="#fff"><circle cx="20" cy="22" r=".5" opacity=".7"/><circle cx="98" cy="18" r=".6" opacity=".7"/><circle cx="104" cy="96" r=".45" opacity=".6"/><circle cx="14" cy="100" r=".5" opacity=".6"/><circle cx="60" cy="8" r=".4" opacity=".5"/></g></svg>`, 'assets/icon-background.png', 1024);
  // splash: logo floating in deep space
  const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732"><defs><radialGradient id="s" cx="50%" cy="48%" r="60%"><stop offset="0" stop-color="#0d1428"/><stop offset=".6" stop-color="#05070f"/><stop offset="1" stop-color="#020307"/></radialGradient></defs><rect width="2732" height="2732" fill="url(#s)"/></svg>`;
  const mark = await sharp(Buffer.from(logoSVG({ bg: 'none', size: 760 })), { density: 300 }).resize(760, 760).png().toBuffer();
  for (const f of ['assets/splash.png', 'assets/splash-dark.png'])
    await sharp(Buffer.from(splash)).composite([{ input: mark, gravity: 'center' }]).png({ compressionLevel: 9 }).toFile(out(f));
  console.log('✓ logo + icons + splash generated');
}
