// Hand-tuned 24px stroke icon set
const P = {
  home: '<path d="M3.5 10.5 12 3.8l8.5 6.7"/><path d="M5.8 9v10.2c0 .7.5 1.2 1.2 1.2h3.4v-5.2c0-.6.5-1 1-1h1.2c.6 0 1 .4 1 1v5.2H17c.7 0 1.2-.5 1.2-1.2V9"/>',
  scan: '<path d="M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5"/><path d="M3 12h18" class="beam"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.5v4h4"/><path d="M12 7.5V12l3 2"/>',
  stats: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12.2c.1 1 .9 1.8 2 1.8h7c1.1 0 1.9-.8 2-1.8l1-12.2M9 7V4.5c0-.3.2-.5.5-.5h5c.3 0 .5.2.5.5V7"/>',
  share: '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v6.5c0 1.4 1.1 2.5 2.5 2.5h9c1.4 0 2.5-1.1 2.5-2.5V12"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 20h15"/>',
  upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4.5 20h15"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
  bolt: '<path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12l1-8z"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 3.9M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  spark: '<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z"/>',
  play: '<path d="M7 4.5v15l12-7.5-12-7.5z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  flash: '<path d="M7 2h10l-2 6h3L9 22l2-9H8z"/>',
  paste: '<rect x="6" y="4" width="12" height="17" rx="2.5"/><path d="M9 4V3h6v1M9 10h6M9 14h4"/>',
  keypad: '<circle cx="6" cy="6" r="1.2"/><circle cx="12" cy="6" r="1.2"/><circle cx="18" cy="6" r="1.2"/><circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/><circle cx="6" cy="18" r="1.2"/><circle cx="12" cy="18" r="1.2"/><circle cx="18" cy="18" r="1.2"/>',
  backspace: '<path d="M21 5H8.5L2.5 12l6 7H21a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="M16.5 9.5l-5 5M11.5 9.5l5 5"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z"/>',
  sky: '<circle cx="6" cy="7" r="1.6"/><circle cx="17" cy="5" r="1.2"/><circle cx="12" cy="13" r="2"/><circle cx="19" cy="17" r="1.4"/><circle cx="5" cy="18" r="1.1"/><path d="M7.3 8l3.4 3.6M13.8 12.2l3-6M13.6 14.3l4.2 2"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  wallet: '<path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6"/><circle cx="16.5" cy="13.5" r="1.3"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.9 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
  sound: '<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  vibrate: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M3 9v6M21 9v6"/>',
  cube: '<path d="M12 2.8 20.5 7.5v9L12 21.2 3.5 16.5v-9L12 2.8z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9.2"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  fire: '<path d="M12 21.5c4 0 7-2.8 7-6.8 0-4.4-3.4-6.9-4.3-11.2-2.7 1.8-3.9 4.4-3.7 7.1-1-.6-1.8-1.6-2.1-2.9C7 9.5 5 11.6 5 14.7c0 4 3 6.8 7 6.8z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>',
  copy: '<rect x="8" y="8" width="12.5" height="12.5" rx="2.5"/><path d="M16 8V5.5A2 2 0 0 0 14 3.5H5.5a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2H8"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L3.5 8.5M4 13a8 8 0 0 0 14.3 4.9l2.2-2.4"/><path d="M3.5 3.5v5h5M20.5 20.5v-5h-5"/>',
  drag: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
  zoom: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3M11 8.5v5M8.5 11h5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  alert: '<path d="M12 3.5 2.5 20h19L12 3.5z"/><path d="M12 10v4.5M12 17.5v.3"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  font: '<path d="M4 20 10 4h1l6 16M6.5 14h8"/><path d="M17 20h4"/>',
  layers: '<path d="M12 3 2.5 8 12 13l9.5-5L12 3z"/><path d="M2.5 12.5 12 17.5l9.5-5M2.5 16.5 12 21.5l9.5-5"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4a1.5 1.5 0 0 1 3 0v6M14 10V5.5a1.5 1.5 0 0 1 3 0V13c0 4.5-2.5 8-7 8-3 0-4.5-1.5-6-4l-1.6-3a1.5 1.5 0 0 1 2.5-1.6L8 15"/>',
};
export function icon(name, cls = '') { return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.spark}</svg>`; }
export const LOGO = (size = 44, id = 'lg') => {
  // V in orbit: two tilted rings pass behind and in front of the mark, a planet rides the front ring
  const sp = (x, y, s, o = 1) => `<path transform="translate(${x} ${y}) scale(${s})" opacity="${o}" d="M0-7C.5-1.6 1.6-.5 7 0C1.6.5.5 1.6 0 7C-.5 1.6-1.6.5-7 0C-1.6-.5-.5-1.6 0-7Z" fill="#fff"/>`;
  return `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 120 120" aria-label="Vedverse">
  <defs>
    <radialGradient id="${id}b" cx="50%" cy="44%" r="72%"><stop offset="0" stop-color="#121b36"/><stop offset=".6" stop-color="#070b18"/><stop offset="1" stop-color="#020307"/></radialGradient>
    <radialGradient id="${id}w" cx="50%" cy="58%" r="40%"><stop offset="0" stop-color="var(--a1)" stop-opacity=".45"/><stop offset="1" stop-color="var(--a1)" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="var(--hot)"/><stop offset="1" stop-color="var(--a1)"/></linearGradient>
    <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--a1)" stop-opacity="0"/><stop offset=".3" stop-color="var(--a1)" stop-opacity=".9"/><stop offset=".72" stop-color="var(--hot)"/><stop offset="1" stop-color="var(--a1)" stop-opacity=".15"/></linearGradient>
    <linearGradient id="${id}s" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="var(--a2)" stop-opacity="0"/><stop offset=".35" stop-color="var(--a2)" stop-opacity=".85"/><stop offset=".75" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="var(--a2)" stop-opacity=".1"/></linearGradient>
    <filter id="${id}g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="${id}f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5"/></filter>
  </defs>
  <circle cx="60" cy="60" r="58" fill="url(#${id}b)" stroke="rgba(255,255,255,.12)" stroke-width="1"/>
  <circle cx="60" cy="60" r="50" fill="url(#${id}w)"/>
  <g class="logo-orbit">
    <path d="M14 64A46 12 0 0 1 106 64" transform="rotate(24 60 64)" fill="none" stroke="url(#${id}s)" stroke-width="1.4" opacity=".75"/>
    <path d="M10 62A50 15 0 0 1 110 62" transform="rotate(-16 60 62)" fill="none" stroke="url(#${id}r)" stroke-width="2.3" opacity=".85"/>
  </g>
  <path d="M27 33H42.5L60 72.5 77.5 33H93L60 95Z" fill="var(--a1)" opacity=".5" filter="url(#${id}f)"/>
  <path d="M27 33H42.5L60 72.5 77.5 33H93L60 95Z" fill="url(#${id}v)"/>
  <g class="logo-orbit">
    <path d="M14 64A46 12 0 0 0 106 64" transform="rotate(24 60 64)" fill="none" stroke="url(#${id}s)" stroke-width="1.6" filter="url(#${id}g)"/>
    <path d="M10 62A50 15 0 0 0 110 62" transform="rotate(-16 60 62)" fill="none" stroke="url(#${id}r)" stroke-width="2.6" filter="url(#${id}g)"/>
    <circle class="logo-planet" cx="99.5" cy="60.7" r="2.7" fill="#fff" filter="url(#${id}g)"/>
  </g>
  ${sp(91, 21, 1.1)}${sp(23, 25, .6, .9)}${sp(102, 95, .5, .8)}
</svg>`;
};
