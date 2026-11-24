// Vedverse — built-in themes (shared by the app and the black-hole renderer)
export const THEMES = {
  // deep, realistic palettes — `temp` is the accretion disk's inner temperature (K), yaw/pitch pick which part of the sky you see
  nebula: { name: 'Event Horizon', bg0: '#020307', bg1: '#0b1020', a1: '#f2a144', a2: '#a9dcff', a3: '#ffd29a', hot: '#fff3dc', temp: 6400, yaw: 0, pitch: 0 },
  aurora: { name: 'Pulsar', bg0: '#01060a', bg1: '#06161c', a1: '#5eead4', a2: '#c7f9ff', a3: '#93c5fd', hot: '#eefcff', temp: 10500, yaw: 0.9, pitch: 0.05 },
  ember: { name: 'Red Giant', bg0: '#060203', bg1: '#170807', a1: '#ff7a3d', a2: '#ffc48a', a3: '#ff4d3d', hot: '#ffe6cc', temp: 3900, yaw: -0.7, pitch: -0.04 },
  abyss: { name: 'Quasar', bg0: '#01030a', bg1: '#070b1f', a1: '#7aa2ff', a2: '#dbe7ff', a3: '#b49cff', hot: '#f2f6ff', temp: 16000, yaw: 2.2, pitch: 0.08 },
  sakura: { name: 'Nova', bg0: '#060306', bg1: '#160a12', a1: '#ff9eb5', a2: '#ffe0e8', a3: '#ffb37a', hot: '#fff1f4', temp: 5200, yaw: -1.6, pitch: 0 },
  cyber: { name: 'Magnetar', bg0: '#030208', bg1: '#0e0a1e', a1: '#c4a1ff', a2: '#8ee8f5', a3: '#f0b8ff', hot: '#ffffff', temp: 12500, yaw: 3.1, pitch: -0.06 },
  mono: { name: 'Void', bg0: '#030303', bg1: '#111113', a1: '#c8c8cc', a2: '#ffffff', a3: '#8a8a90', hot: '#ffffff', temp: 7000, sat: 0, yaw: 1.4, pitch: 0.03 },
  // more disk colours — same hole, the accretion light is tinted
  solar: { name: 'Solar Flare', bg0: '#050302', bg1: '#161004', a1: '#fbbf24', a2: '#fde68a', a3: '#fb923c', hot: '#fffbeb', temp: 6000, tint: '#ffcf5a', yaw: 0.45, pitch: 0.02 },
  emerald: { name: 'Emerald', bg0: '#010604', bg1: '#05160f', a1: '#34d399', a2: '#a7f3d0', a3: '#5eead4', hot: '#ecfdf5', temp: 7800, tint: '#4dffa6', yaw: -0.35, pitch: 0.04 },
  violet: { name: 'Violet Nebula', bg0: '#04020a', bg1: '#120a26', a1: '#a78bfa', a2: '#ddd6fe', a3: '#f0abfc', hot: '#f5f3ff', temp: 9500, tint: '#a67cff', yaw: 1.1, pitch: -0.03 },
  crimson: { name: 'Crimson', bg0: '#070203', bg1: '#1c0609', a1: '#f43f5e', a2: '#fecdd3', a3: '#fb7185', hot: '#fff1f2', temp: 4600, tint: '#ff3b4f', yaw: -1.2, pitch: 0.02 },
  glacier: { name: 'Glacier', bg0: '#01050a', bg1: '#06131f', a1: '#67e8f9', a2: '#e0f2fe', a3: '#93c5fd', hot: '#f0f9ff', temp: 15000, tint: '#8be9ff', yaw: 2.6, pitch: 0.05 },
  rosegold: { name: 'Rose Gold', bg0: '#060304', bg1: '#1a0e0f', a1: '#f4a6a0', a2: '#fde2d6', a3: '#e8b4a0', hot: '#fff5f0', temp: 5200, tint: '#ffb09a', yaw: -2.0, pitch: -0.02 },
  teal: { name: 'Cosmic Teal', bg0: '#010506', bg1: '#051516', a1: '#2dd4bf', a2: '#99f6e4', a3: '#38bdf8', hot: '#f0fdfa', temp: 9000, tint: '#38f0d8', yaw: 1.8, pitch: 0.06 },
  inferno: { name: 'Inferno', bg0: '#070301', bg1: '#1d0b02', a1: '#ff7a1a', a2: '#ffd0a1', a3: '#ef4444', hot: '#fff7ed', temp: 3600, tint: '#ff6a1a', yaw: -0.9, pitch: -0.05 },
  magenta: { name: 'Magenta Pulsar', bg0: '#060207', bg1: '#1a0619', a1: '#e879f9', a2: '#f5d0fe', a3: '#c084fc', hot: '#fdf4ff', temp: 10000, tint: '#f070ff', yaw: 3.0, pitch: 0.03 },
  pearl: { name: 'Stardust', bg0: '#040404', bg1: '#14120f', a1: '#e5c07b', a2: '#f5f3ee', a3: '#c8b6a6', hot: '#fffaf0', temp: 5600, sat: 0.6, yaw: -2.5, pitch: 0.02 },
};
