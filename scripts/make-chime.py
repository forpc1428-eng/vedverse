# Bakes the Vedverse "cosmic chime" notification sound -> native/android/res/raw/vv_chime.wav
# Two soft bell partials with a shimmering tail; 1.4 s, mono 16-bit 32 kHz.
import os, wave
import numpy as np

SR = 32000
T = 1.4
t = np.arange(int(SR * T)) / SR

def bell(f, start, amp, decay):
    x = np.zeros_like(t)
    m = t >= start
    tt = t[m] - start
    env = np.minimum(tt / 0.006, 1.0) * np.exp(-tt * decay)
    partials = [(1.0, 1.0), (2.01, 0.38), (2.98, 0.16), (4.07, 0.07)]
    s = sum(a * np.sin(2 * np.pi * f * k * tt + 0.3 * k) for k, a in partials)
    x[m] = amp * env * s
    return x

sig = bell(1046.5, 0.0, 0.55, 4.2) + bell(1567.98, 0.11, 0.42, 3.6) + bell(2093.0, 0.24, 0.18, 5.0)
# shimmer: faint detuned high tail
sh = 0.05 * np.sin(2 * np.pi * 3136 * t) * np.sin(2 * np.pi * 5.5 * t) * np.exp(-t * 3.0) * (t > 0.25)
sig = sig + sh
# simple feedback echo for space
d = int(0.13 * SR)
out = sig.copy()
for i in range(d, len(out)):
    out[i] += out[i - d] * 0.28
out *= np.minimum(1.0, (T - t) / 0.15)  # fade tail
out = out / np.max(np.abs(out)) * 0.82
pcm = (out * 32767).astype('<i2')

dst = os.path.join(os.path.dirname(__file__), '..', 'native', 'android', 'res', 'raw')
os.makedirs(dst, exist_ok=True)
with wave.open(os.path.join(dst, 'vv_chime.wav'), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', len(pcm))
