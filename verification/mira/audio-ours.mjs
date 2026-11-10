// src/lib/miraAudio.ts
var TIMING = { full: { con: 0.34, chk: 1.55, thr: 5.35, call: 5.92, set: 10.1, end: 13.1 } };
var HUMANOID = { total: 7.4, ignition: 6.2, hornPeak: 6.2 + 3.2 * 0.19 };
var gN = 0.75;
var vN = 0.72;
var qe = null;
var Ho = null;
var hg = null;
var Dx = null;
var dg = null;
var pg = null;
var Ag = null;
var bg = null;
var fp = null;
var voices = [];
var tracked = {};
var trackVoices = null;
var synthCache = null;
var primed = 0;
var rnd = () => Math.random();
var hasPanner = (c) => typeof c.createStereoPanner === "function";
function makeImpulse(c, dur, exp) {
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, exp);
  }
  return buf;
}
function shaperCurve(drive) {
  const t = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    const x = i * 2 / 1024 - 1;
    t[i] = (1 + drive) * x / (1 + drive * Math.abs(x));
  }
  return t;
}
function ensureAudio() {
  if (qe) return qe;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  qe = new AC();
  Ho = qe.createDynamicsCompressor();
  Ho.threshold.value = -8;
  Ho.knee.value = 12;
  Ho.ratio.value = 3.5;
  Ho.attack.value = 6e-3;
  Ho.release.value = 0.25;
  hg = qe.createGain();
  hg.gain.value = vN * 0.62;
  Dx = qe.createGain();
  Ag = qe.createConvolver();
  Ag.buffer = makeImpulse(qe, 3.2, 2.4);
  bg = qe.createConvolver();
  bg.buffer = makeImpulse(qe, 6, 1.7);
  const send = gN;
  dg = qe.createGain();
  dg.gain.value = send;
  pg = qe.createGain();
  pg.gain.value = send * 1.15;
  Dx.connect(Ho);
  Ag.connect(dg);
  dg.connect(Ho);
  bg.connect(pg);
  pg.connect(Ho);
  Ho.connect(hg);
  hg.connect(qe.destination);
  const n = Math.floor(qe.sampleRate * 2);
  fp = qe.createBuffer(1, n, qe.sampleRate);
  const d = fp.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return qe;
}
var clock = () => {
  const c = ensureAudio();
  if (!c) return 0;
  if (c.state === "suspended") void c.resume();
  return c.currentTime;
};
function bus(node, send, big) {
  node.connect(Dx);
  if (send > 0) {
    const g = qe.createGain();
    g.gain.value = send;
    node.connect(g);
    g.connect(Ag);
  }
  if (big > 0) {
    const g = qe.createGain();
    g.gain.value = big;
    node.connect(g);
    g.connect(bg);
  }
}
function track(node) {
  voices.push(node);
  trackVoices?.push(node);
  node.onended = () => {
    voices = voices.filter((e) => e !== node);
  };
}
function fmBlip({
  f = 440,
  ratio = 2.76,
  index = 600,
  indexEnd = 8,
  dur = 0.2,
  peak = 0.18,
  attack = 0.012,
  delay = 0,
  fEnd = null,
  detune = 0,
  send = 0.45,
  big = 0,
  type = "sine",
  drive = 0,
  t0 = null
} = {}) {
  const t = (t0 ?? clock()) + delay;
  const w = qe.createOscillator();
  w.type = type;
  w.detune.value = detune;
  w.frequency.setValueAtTime(f, t);
  if (fEnd) w.frequency.exponentialRampToValueAtTime(fEnd, t + dur);
  const M = qe.createOscillator();
  M.type = "sine";
  M.frequency.setValueAtTime(f * ratio, t);
  if (fEnd) M.frequency.exponentialRampToValueAtTime(fEnd * ratio, t + dur);
  const R = qe.createGain();
  R.gain.setValueAtTime(Math.max(index, 1), t);
  R.gain.exponentialRampToValueAtTime(Math.max(indexEnd, 1), t + dur);
  M.connect(R);
  R.connect(w.frequency);
  const b = qe.createGain();
  b.gain.setValueAtTime(1e-4, t);
  b.gain.exponentialRampToValueAtTime(peak, t + attack);
  b.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  w.connect(b);
  let I = b;
  if (drive > 0) {
    const B = qe.createWaveShaper();
    B.curve = shaperCurve(drive);
    b.connect(B);
    I = B;
  }
  bus(I, send, big);
  w.start(t);
  M.start(t);
  w.stop(t + dur + 0.05);
  M.stop(t + dur + 0.05);
  track(w);
  track(M);
}
function noiseSweep({
  from = 400,
  to = 2400,
  q = 7,
  dur = 0.3,
  peak = 0.16,
  attack = 0.04,
  delay = 0,
  type = "bandpass",
  send = 0.55,
  big = 0,
  t0 = null
} = {}) {
  const g = (t0 ?? clock()) + delay;
  const v = qe.createBufferSource();
  v.buffer = fp;
  v.loop = true;
  const y = qe.createBiquadFilter();
  y.type = type;
  y.Q.value = q;
  y.frequency.setValueAtTime(from, g);
  y.frequency.exponentialRampToValueAtTime(to, g + dur);
  const e = qe.createGain();
  e.gain.setValueAtTime(1e-4, g);
  e.gain.exponentialRampToValueAtTime(peak, g + attack);
  e.gain.exponentialRampToValueAtTime(1e-4, g + dur);
  v.connect(y);
  y.connect(e);
  bus(e, send, big);
  v.start(g);
  v.stop(g + dur + 0.06);
  track(v);
}
function thump({
  f = 62,
  dur = 0.22,
  peak = 0.22,
  delay = 0,
  fEnd = null,
  send = 0.15,
  big = 0,
  drive = 0,
  attack = 0.016,
  t0 = null
} = {}) {
  const m = (t0 ?? clock()) + delay;
  const g = qe.createOscillator();
  g.type = "sine";
  g.frequency.setValueAtTime(f, m);
  if (fEnd) g.frequency.exponentialRampToValueAtTime(fEnd, m + dur);
  const v = qe.createGain();
  v.gain.setValueAtTime(1e-4, m);
  v.gain.exponentialRampToValueAtTime(peak, m + attack);
  v.gain.exponentialRampToValueAtTime(1e-4, m + dur);
  g.connect(v);
  let y = v;
  if (drive > 0) {
    const _ = qe.createWaveShaper();
    _.curve = shaperCurve(drive);
    v.connect(_);
    y = _;
  }
  bus(y, send, big);
  g.start(m);
  g.stop(m + dur + 0.05);
  track(g);
}
function voice({
  f = 52,
  dur = 4,
  peak = 0.5,
  bend = [0.93, 1, 1.05, 1, 0.955],
  formants = [[205, 5, 1], [540, 7, 0.62], [1150, 9, 0.28]],
  drive = 2.8,
  spread = 0.62,
  wobble = 0.75,
  shimmer = false,
  send = 0.5,
  big = 1,
  t0 = null
} = {}) {
  const v = t0 ?? clock();
  const y = qe.createGain();
  const oscs = [];
  [[-spread, -9], [0, 0], [spread, 11]].forEach(([pan, det]) => {
    const K = qe.createOscillator();
    K.type = "sawtooth";
    K.detune.value = det;
    K.frequency.setValueCurveAtTime(new Float32Array(bend.map((r) => f * r)), v, dur);
    const J = qe.createGain();
    J.gain.value = 0.32;
    K.connect(J);
    if (hasPanner(qe)) {
      const re = qe.createStereoPanner();
      re.pan.value = pan;
      J.connect(re);
      re.connect(y);
    } else J.connect(y);
    K.start(v);
    K.stop(v + dur + 0.12);
    track(K);
    oscs.push(K);
  });
  const E = qe.createOscillator();
  E.type = "sine";
  E.frequency.value = wobble;
  const w = qe.createGain();
  w.gain.value = f * 0.014;
  E.connect(w);
  oscs.forEach((D) => w.connect(D.frequency));
  E.start(v);
  E.stop(v + dur + 0.12);
  track(E);
  const M = qe.createOscillator();
  M.type = "sine";
  M.frequency.setValueAtTime(f / 2, v);
  const R = qe.createGain();
  R.gain.value = 0.55;
  M.connect(R);
  R.connect(y);
  M.start(v);
  M.stop(v + dur + 0.12);
  track(M);
  const b = qe.createBufferSource();
  b.buffer = fp;
  b.loop = true;
  const I = qe.createBiquadFilter();
  I.type = "bandpass";
  I.frequency.value = 430;
  I.Q.value = 1.1;
  const B = qe.createGain();
  B.gain.value = 0.07;
  b.connect(I);
  I.connect(B);
  B.connect(y);
  b.start(v);
  b.stop(v + dur + 0.12);
  track(b);
  const N = qe.createWaveShaper();
  N.curve = shaperCurve(drive);
  y.connect(N);
  const k = qe.createGain();
  formants.forEach(([D, X, K]) => {
    const J = qe.createBiquadFilter();
    J.type = "bandpass";
    J.frequency.value = D;
    J.Q.value = X;
    const re = qe.createGain();
    re.gain.value = K;
    N.connect(J);
    J.connect(re);
    re.connect(k);
  });
  const z = qe.createGain();
  z.gain.value = 0.42;
  N.connect(z);
  z.connect(k);
  const Z = qe.createBiquadFilter();
  Z.type = "lowpass";
  Z.frequency.value = 4400;
  Z.Q.value = 0.7;
  const L = qe.createGain();
  L.gain.setValueAtTime(1e-4, v);
  L.gain.exponentialRampToValueAtTime(peak, v + dur * 0.19);
  L.gain.setValueAtTime(peak, v + dur * 0.52);
  L.gain.exponentialRampToValueAtTime(1e-4, v + dur);
  k.connect(Z);
  Z.connect(L);
  bus(L, send, big);
  if (shimmer) {
    ;
    [2100, 3400, 5100].forEach((D, X) => {
      const K = qe.createOscillator();
      K.type = "sine";
      K.frequency.value = D * (1 + (X - 1) * 4e-3);
      const J = qe.createGain();
      J.gain.setValueAtTime(1e-4, v + dur * 0.42);
      J.gain.exponentialRampToValueAtTime([0.022, 0.014, 8e-3][X], v + dur * 0.72);
      J.gain.exponentialRampToValueAtTime(1e-4, v + dur);
      K.connect(J);
      bus(J, 0.4, 1);
      K.start(v + dur * 0.42);
      K.stop(v + dur + 0.1);
      track(K);
    });
  }
}
function repeat(ms, fn) {
  fn();
  const t = setInterval(fn, ms);
  return { stop: () => clearInterval(t) };
}
function drone(build) {
  const e = clock();
  const t = qe.createGain();
  t.gain.setValueAtTime(1e-4, e);
  const n = build(t, e);
  n.forEach((r) => r.start(e));
  return {
    stop() {
      const r = qe.currentTime;
      t.gain.cancelScheduledValues(r);
      t.gain.setValueAtTime(Math.max(t.gain.value, 1e-4), r);
      t.gain.exponentialRampToValueAtTime(1e-4, r + 0.4);
      setTimeout(() => n.forEach((o) => {
        try {
          o.stop();
        } catch {
        }
      }), 520);
    }
  };
}
function loadingDrone(f, noise) {
  return drone((t, n) => {
    t.gain.exponentialRampToValueAtTime(0.5, n + 0.6);
    const r = [];
    const o = qe.createOscillator();
    o.type = "sine";
    o.frequency.value = 146.8;
    const a = qe.createGain();
    a.gain.value = 0.09;
    const c = qe.createOscillator();
    c.type = "triangle";
    c.frequency.value = f;
    const h = qe.createGain();
    h.gain.value = 0.075;
    c.connect(h);
    h.connect(a.gain);
    const p = qe.createBiquadFilter();
    p.type = "lowpass";
    p.Q.value = 9;
    p.frequency.value = 340;
    const m = qe.createOscillator();
    m.type = "triangle";
    m.frequency.value = f * 0.73;
    const g = qe.createGain();
    g.gain.value = 170;
    m.connect(g);
    g.connect(p.frequency);
    o.connect(a);
    a.connect(p);
    p.connect(t);
    r.push(o, c, m);
    const v = qe.createBufferSource();
    v.buffer = fp;
    v.loop = true;
    const y = qe.createBiquadFilter();
    y.type = "bandpass";
    y.frequency.value = 820;
    y.Q.value = 9;
    const _ = qe.createGain();
    _.gain.value = noise;
    const E = qe.createOscillator();
    E.type = "sine";
    E.frequency.value = f * 0.61;
    const w = qe.createGain();
    w.gain.value = 520;
    E.connect(w);
    w.connect(y.frequency);
    v.connect(y);
    y.connect(_);
    _.connect(t);
    r.push(v, E);
    bus(t, 0.6, 0.35);
    return r;
  });
}
var sn = () => {
  fmBlip({ f: 98, ratio: 2.76, index: 520, indexEnd: 6, dur: 0.55, peak: 0.13, attack: 0.02, send: 0.6, big: 0.85 });
  thump({ f: 49, dur: 0.5, peak: 0.09, send: 0.3, big: 0.5 });
};
function bell() {
  const i = clock();
  [0, 0.62].forEach((e) => {
    const t = qe.createOscillator();
    t.type = "sine";
    t.frequency.value = 392;
    const n = qe.createOscillator();
    n.type = "sine";
    n.frequency.value = 392 * 1.414;
    const r = qe.createGain();
    r.gain.value = 240;
    n.connect(r);
    r.connect(t.frequency);
    const o = qe.createGain();
    o.gain.setValueAtTime(1e-4, i + e);
    o.gain.exponentialRampToValueAtTime(0.1, i + e + 0.07);
    o.gain.exponentialRampToValueAtTime(1e-4, i + e + 0.44);
    const a = qe.createOscillator();
    a.type = "sine";
    a.frequency.value = 6.5;
    const c = qe.createGain();
    c.gain.value = 0.042;
    a.connect(c);
    c.connect(o.gain);
    t.connect(o);
    bus(o, 0.6, 0.55);
    t.start(i + e);
    n.start(i + e);
    a.start(i + e);
    t.stop(i + e + 0.5);
    n.stop(i + e + 0.5);
    a.stop(i + e + 0.5);
    track(t);
    track(n);
    track(a);
  });
}
var cueFailed = () => [880, 294, 110].forEach((f, i) => fmBlip({
  f,
  ratio: 2.76,
  index: 320,
  indexEnd: 14,
  dur: 0.42,
  peak: [0.055, 0.1, 0.15][i],
  attack: 0.018,
  delay: i * 0.1,
  fEnd: f * 0.93,
  send: 0.45,
  big: 0.35
}));
var VOICES = [
  {
    k: "A",
    name: "Tripod",
    play: (i, e) => voice({
      f: 52,
      dur: i,
      peak: 0.52,
      drive: 2.8,
      t0: e,
      formants: [[205, 5, 1], [540, 7, 0.62], [1150, 9, 0.28]],
      bend: [0.93, 1, 1.05, 1, 0.955]
    })
  },
  {
    k: "B",
    name: "Leviathan",
    play: (i, e) => voice({
      f: 36,
      dur: i * 1.08,
      peak: 0.56,
      drive: 3.4,
      wobble: 0.5,
      spread: 0.7,
      t0: e,
      formants: [[128, 4, 1], [330, 6, 0.55], [760, 8, 0.2]],
      bend: [0.96, 1, 1.03, 0.99, 0.93]
    })
  }
];
var tn = (dur, t0) => thump({ f: 41, dur, peak: 0.17, attack: 0.4, send: 0.5, big: 1, t0 });
function swell(i, scale = 1) {
  const n = TIMING.full;
  const r = n.thr - n.chk;
  const o = n.chk - 0.2;
  const a = n.chk + r * scale;
  const c = qe.createGain();
  c.gain.setValueAtTime(1e-4, i + o);
  c.gain.exponentialRampToValueAtTime(0.08, i + n.chk);
  c.gain.exponentialRampToValueAtTime(0.19, i + a - 0.12);
  c.gain.exponentialRampToValueAtTime(1e-4, i + a + 0.14);
  const h = qe.createBiquadFilter();
  h.type = "lowpass";
  h.Q.value = 7;
  h.frequency.setValueAtTime(120, i + o);
  h.frequency.exponentialRampToValueAtTime(120 + 4280 * scale, i + a);
  const p = qe.createWaveShaper();
  p.curve = shaperCurve(1);
  const m = qe.createGain();
  m.gain.setValueAtTime(1, i + o);
  m.gain.setValueAtTime(1, i + n.chk + r * 0.6 * scale);
  m.gain.linearRampToValueAtTime(1 + 3.2 * scale, i + a);
  [55, 82.5, 110.9].forEach((g, v) => {
    const y = qe.createOscillator();
    y.type = "sine";
    y.frequency.setValueAtTime(g, i + o);
    y.frequency.exponentialRampToValueAtTime(g * (1 + 1.9 * scale), i + a);
    const _ = qe.createGain();
    _.gain.value = [1, 0.5, 0.28][v];
    y.connect(_);
    _.connect(m);
    y.start(i + o);
    y.stop(i + a + 0.35);
    track(y);
  });
  m.connect(p);
  p.connect(h);
  h.connect(c);
  bus(c, 0.6, 0.4);
}
function callRiser(i) {
  const e = TIMING.full;
  const t = e.call - e.thr;
  const n = qe.createOscillator();
  n.type = "sine";
  n.frequency.setValueAtTime(2900, i + e.thr);
  n.frequency.linearRampToValueAtTime(3280, i + e.call);
  const r = qe.createGain();
  r.gain.setValueAtTime(1e-4, i + e.thr);
  r.gain.exponentialRampToValueAtTime(0.028, i + e.thr + 0.05);
  r.gain.exponentialRampToValueAtTime(1e-4, i + e.call);
  n.connect(r);
  bus(r, 0.8, 0.6);
  n.start(i + e.thr);
  n.stop(i + e.call + 0.05);
  track(n);
  noiseSweep({ from: 280, to: 5200, q: 1.2, dur: t * 0.95, peak: 0.1, attack: t * 0.88, send: 0.5, big: 0.6, t0: i + e.thr });
}
var cueReady = () => [110, 294, 880].forEach((f, i) => fmBlip({
  f,
  ratio: 2.76,
  index: 260,
  indexEnd: 6,
  dur: 0.66,
  peak: [0.17, 0.09, 0.05][i],
  attack: 0.17,
  delay: i * 0.07,
  send: 0.8,
  big: 0.6
}));
var cueNeedsYou = () => [0, 0.19].forEach((i) => {
  fmBlip({ f: 330, ratio: 1.414, index: 380, indexEnd: 14, dur: 0.12, peak: 0.14, attack: 0.014, delay: i, send: 0.6, big: 0.4 });
  fmBlip({ f: 467, ratio: 1.414, index: 260, indexEnd: 10, dur: 0.12, peak: 0.07, attack: 0.02, delay: i, send: 0.6 });
});
var cueEnter = () => {
  noiseSweep({ from: 160, to: 2100, q: 9, dur: 1.7, peak: 0.11, attack: 0.55, send: 0.85, big: 0.7 });
  thump({ f: 44, fEnd: 92, dur: 1.9, peak: 0.2, attack: 0.6, send: 0.45, big: 0.6 });
  [523, 659, 784].forEach((f, i) => fmBlip({
    f,
    ratio: 1.5,
    index: 130,
    indexEnd: 4,
    dur: 1.3,
    peak: [0.06, 0.05, 0.04][i],
    attack: 0.35,
    delay: 0.7 + i * 0.13,
    send: 0.85,
    big: 0.8
  }));
};
var cueExit = () => {
  noiseSweep({ from: 1700, to: 150, q: 9, dur: 1.3, peak: 0.09, attack: 0.2, send: 0.75, big: 0.5 });
  thump({ f: 84, fEnd: 40, dur: 1.3, peak: 0.15, attack: 0.2, send: 0.35, big: 0.4 });
};
var LN = {
  miraEnter: cueEnter,
  miraExit: cueExit,
  loading: () => loadingDrone(0.34, 9e-3),
  working: () => repeat(2600, sn),
  ready: cueReady,
  needsYou: cueNeedsYou,
  alert: bell,
  failed: cueFailed
};
function cue(name) {
  const e = LN[name];
  if (!e) return null;
  ensureAudio();
  if (qe.state === "suspended") void qe.resume();
  const t = e();
  if (t && t.stop) {
    stopCue(name);
    tracked[name] = t;
  }
  return t ?? null;
}
function stopCue(name) {
  if (tracked[name]) {
    try {
      tracked[name].stop();
    } catch {
    }
    delete tracked[name];
  }
}
function assembly() {
  const i = clock();
  thump({ f: 30, fEnd: 44, dur: 1.5, peak: 0.13, attack: 0.7, send: 0.8, big: 1, t0: i });
  swell(i, 1);
  const t = 54;
  const n = 1.1;
  const r = TIMING.full.thr - 0.06;
  for (let a = 0; a < t; a++) {
    const c = a / (t - 1);
    const h = i + n + (r - n) * Math.pow(c, 0.62) + (rnd() - 0.5) * 0.05;
    fmBlip({
      f: 260 + c * 700,
      ratio: 2.76,
      index: 320 + c * 420,
      indexEnd: 7,
      dur: 0.11 + rnd() * 0.04,
      peak: 0.018 + c * 0.026,
      attack: 3e-3,
      send: 0.6,
      big: 0.3 + c * 0.35,
      drive: c > 0.7 ? (c - 0.7) * 5 : 0,
      t0: h
    });
    if (a % 9 === 0) thump({ f: 54 + c * 26, dur: 0.22, peak: 0.05 + c * 0.04, send: 0.35, big: 0.45, t0: h });
  }
  callRiser(i);
  const o = 3.2;
  VOICES[0].play(o, i + HUMANOID.ignition);
  tn(2.6, i + HUMANOID.ignition + o * 0.72);
}
var Ww = (i) => i < 0.05 ? 1 : i < 0.09 ? 0.1 : i < 0.16 ? 0.95 : i < 0.2 ? 0.28 : i < 0.32 ? 0.5 * (1 - (i - 0.2) / 0.12) + 0.03 : Math.max(0, 0.03 * (1 - (i - 0.32) / 0.1));
function grains(i, e, t, n, { rate, tau = 35e-5, amp = 1, gate = () => 1, snap = 0.5 }) {
  const p = Math.exp(-1 / (tau * t));
  let m = 0;
  let g = 0;
  for (let v = 0; v < n; v++) {
    const y = v / t;
    const _ = gate(y);
    if (_ > 0 && Math.random() < rate(y) * _ / t) {
      const E = amp * _ * (0.2 + 0.8 * Math.random() * Math.random());
      const w = Math.random();
      const M = E * (0.55 + 0.45 * w);
      const R = E * (1 - 0.45 * w);
      m += M;
      g += R;
      const b = Math.random() < 0.5 ? -1 : 1;
      i[v] += b * M * snap;
      e[v] += b * R * snap;
    }
    m *= p;
    g *= p;
    i[v] += (Math.random() * 2 - 1) * m;
    e[v] += (Math.random() * 2 - 1) * g;
  }
}
function sawSputter(i, e, t, n, { f = 100, amp = 0.4, gate = () => 1, drive = 5, sputter = true }) {
  let p = 0;
  let m = -1;
  let g = 1;
  let v = 0;
  const y = Math.tanh(drive);
  for (let _ = 0; _ < n; _++) {
    const E = _ / t;
    if (sputter) {
      const R = Math.floor(E * 140);
      if (R !== m) {
        m = R;
        g = Math.random() < 0.75 ? 0.55 + 0.45 * Math.random() : 0.06;
        v = (Math.random() - 0.5) * 0.07;
      }
    }
    p += 2 * Math.PI * f * (1 + v) / t;
    const M = Math.tanh(drive * (Math.sin(p) + 0.4 * Math.sin(2 * p + 0.7) + 0.25 * Math.sin(3 * p + 1.9))) / y * amp * g * gate(E);
    i[_] += M;
    e[_] += M * 0.92;
  }
}
function swells(i, e, t, n, { amp = 1, swells: o = 4, decay = 1.6, spread = 0.9 } = {}) {
  const h = Array.from({ length: o }, (_, _2) => ({
    at: _2 === 0 ? 0 : Math.random() * spread,
    a: _2 === 0 ? 1 : 0.35 + 0.5 * Math.random()
  }));
  let p = 0;
  let m = 0;
  let g = 0;
  let v = 0;
  for (let y = 0; y < n; y++) {
    const _ = y / t;
    let E = 0;
    for (const w of h) {
      if (_ >= w.at) E += w.a * Math.min(1, (_ - w.at) / 0.012) * Math.exp(-(_ - w.at) / (decay * (0.5 + 0.5 * w.a)));
    }
    p = 0.985 * p + (Math.random() * 2 - 1) * 0.1;
    m = 0.985 * m + (Math.random() * 2 - 1) * 0.1;
    g += (p - g) * 0.08;
    v += (m - v) * 0.08;
    i[y] += g * 3 * E * amp;
    e[y] += v * 3 * E * amp;
  }
}
function norm(i, e, peak = 0.9) {
  let n = 1e-6;
  for (let o = 0; o < i.length; o++) n = Math.max(n, Math.abs(i[o]), Math.abs(e[o]));
  const r = peak / n;
  for (let o = 0; o < i.length; o++) {
    i[o] *= r;
    e[o] *= r;
  }
}
function syn() {
  if (synthCache) return synthCache;
  ensureAudio();
  const sr = qe.sampleRate;
  const buf = (dur, fill, peak = 0.9) => {
    const n = Math.max(2, Math.floor(dur * sr));
    const b = qe.createBuffer(2, n, sr);
    const L = b.getChannelData(0);
    const R = b.getChannelData(1);
    fill(L, R, sr, n);
    norm(L, R, peak);
    return b;
  };
  synthCache = {
    strikes: Array.from({ length: 6 }, () => buf(0.42, (L, R, sr2, n) => {
      grains(L, R, sr2, n, { rate: (a) => a < 0.015 ? 3e4 : 9e3, tau: 2e-4 + Math.random() * 4e-4, gate: Ww, snap: 0.7 });
      sawSputter(L, R, sr2, n, { f: 85 + Math.random() * 60, amp: 0.22, gate: Ww });
    })),
    burst: buf(1.6, (L, R, sr2, n) => {
      grains(L, R, sr2, n, {
        rate: (a) => 26e3 * Math.exp(-a * 2.2) + 600,
        tau: 5e-4,
        gate: (a) => a < 0.03 || a > 0.045 && a < 0.09 ? 1 : 0.7 * Math.exp(-a * 1.6) * (0.6 + 0.4 * Math.random()),
        snap: 0.9
      });
      sawSputter(L, R, sr2, n, { f: 100, amp: 0.3, gate: (a) => Math.exp(-a * 2.4) });
    }),
    thunder: buf(3.2, (L, R, sr2, n) => swells(L, R, sr2, n, { swells: 5, decay: 1.4 }), 0.8),
    boom: buf(6.5, (L, R, sr2, n) => swells(L, R, sr2, n, { swells: 9, decay: 2.6, spread: 3 }), 0.95),
    sizzle: buf(2, (L, R, sr2, n) => {
      grains(L, R, sr2, n, { rate: () => 2600, tau: 25e-5, snap: 0.4 });
      grains(L, R, sr2, n, { rate: () => 7, tau: 15e-4, amp: 2.5, snap: 0.9 });
    }, 0.7),
    hum: buf(2, (L, R, sr2, n) => sawSputter(L, R, sr2, n, { f: 100, amp: 0.5, drive: 3.5, sputter: false }), 0.6)
  };
  return synthCache;
}
function playBuf(buf, t0, {
  gain = 0.3,
  rate = 1,
  pan = 0,
  send = 0.4,
  big = 0.4,
  loop = false,
  dur = null,
  filter = null,
  env = null
} = {}) {
  const g = qe.createBufferSource();
  g.buffer = buf;
  g.loop = loop;
  g.playbackRate.value = rate;
  let v = g;
  if (filter) {
    const _ = qe.createBiquadFilter();
    _.type = filter.type;
    _.Q.value = filter.q || 0.7;
    _.frequency.setValueAtTime(filter.from, t0);
    if (filter.to) _.frequency.exponentialRampToValueAtTime(filter.to, t0 + (dur || buf.duration));
    v.connect(_);
    v = _;
  }
  const y = qe.createGain();
  if (env) env(y.gain, t0);
  else y.gain.value = gain;
  v.connect(y);
  v = y;
  if (pan && hasPanner(qe)) {
    const _ = qe.createStereoPanner();
    _.pan.value = pan;
    v.connect(_);
    v = _;
  }
  bus(v, send, big);
  g.start(t0);
  if (dur != null) g.stop(t0 + dur + 0.05);
  track(g);
  return g;
}
var envPoints = (pts) => (p, t) => {
  p.setValueAtTime(1e-4, t);
  for (const [n, r] of pts) p.exponentialRampToValueAtTime(Math.max(1e-4, r), t + n);
};
var cueWindow = (cue2, e, t) => {
  const n = Math.max(cue2.t, t);
  return { s: e + n, d: cue2.t + cue2.dur - n, into: n - cue2.t };
};
var CUE_KINDS = {
  hum(cue2, e, t) {
    const { s: n, d: r } = cueWindow(cue2, e, t);
    if (r < 0.2) return;
    const o = syn();
    playBuf(o.hum, n, {
      loop: true,
      dur: r,
      send: 0.35,
      big: 0.5,
      filter: { type: "lowpass", from: 2400, q: 0.8 },
      env: envPoints([[0.12, 0.1], [Math.max(0.13, r - 0.7), 0.085], [r, 1e-4]])
    });
    playBuf(o.sizzle, n, {
      loop: true,
      dur: r,
      send: 0.5,
      big: 0.6,
      filter: { type: "highpass", from: 1800 },
      env: envPoints([[0.1, 0.07], [Math.max(0.11, r - 0.5), 0.04], [r, 1e-4]])
    });
  },
  strike(cue2, e, t) {
    if (cue2.t < t - 0.02) return;
    const n = syn();
    const r = e + cue2.t;
    const o = cue2.strength || 1;
    playBuf(n.strikes[Math.floor(rnd() * n.strikes.length)], r, {
      gain: 0.34 * o,
      rate: 0.82 + rnd() * 0.4,
      pan: cue2.pan || 0,
      send: 0.45,
      big: 0.55
    });
    if (o > 1.05) {
      playBuf(n.thunder, r + 5e-3, {
        gain: 0.14 * o,
        rate: 1.3 + rnd() * 0.3,
        pan: (cue2.pan || 0) * 0.6,
        send: 0.25,
        big: 0.8,
        dur: 1.4
      });
    }
  },
  gather(cue2, e, t) {
    const { s: n, d: r } = cueWindow(cue2, e, t);
    if (r < 0.15) return;
    playBuf(syn().sizzle, n, {
      loop: true,
      dur: r + 0.3,
      send: 0.7,
      big: 0.8,
      filter: { type: "bandpass", from: 500, to: 3600, q: 1.2 },
      env: envPoints([[r * 0.9, 0.16], [r + 0.3, 0.05]])
    });
  },
  boil(cue2, e, t) {
    const { s: n, d: r, into: o } = cueWindow(cue2, e, t);
    if (r < 0.15) return;
    const a = syn();
    const c = n + r;
    playBuf(a.sizzle, n, {
      loop: true,
      rate: 1,
      dur: r + 0.05,
      send: 0.5,
      big: 0.5,
      filter: { type: "highpass", from: 900, to: 2200 },
      env: envPoints([[Math.min(0.4, r), 0.06], [r, 0.2]])
    });
    const h = playBuf(a.hum, n, {
      loop: true,
      dur: r + 0.05,
      send: 0.4,
      big: 0.6,
      filter: { type: "lowpass", from: 260, to: 3200, q: 2.5 },
      env: envPoints([[Math.min(0.5, r), 0.03], [r, 0.13]])
    });
    h.playbackRate.setValueAtTime(1, n);
    h.playbackRate.linearRampToValueAtTime(1.45, c);
    let p = o;
    while (p < cue2.dur - 0.06) {
      const m = p / cue2.dur;
      playBuf(a.strikes[Math.floor(rnd() * a.strikes.length)], e + cue2.t + p, {
        gain: 0.05 + 0.12 * m,
        rate: 1.3 + rnd() * 0.5,
        pan: (rnd() - 0.5) * 0.5,
        send: 0.5,
        big: 0.45,
        dur: 0.3
      });
      p += (0.5 - 0.38 * m) * (0.5 + rnd());
    }
  },
  needle(cue2, e, t) {
    const { s: n, d: r, into: o } = cueWindow(cue2, e, t);
    if (r < 0.1) return;
    const a = syn();
    const c = Math.min(cue2.busy.length - 1, Math.floor(o / cue2.step));
    const h = cue2.busy.slice(c);
    if (h.length < 2) return;
    playBuf(a.sizzle, n, {
      loop: true,
      rate: 1.5,
      dur: r,
      send: 0.35,
      big: 0.25,
      filter: { type: "highpass", from: 2600 },
      env: (p, m) => p.setValueCurveAtTime(Float32Array.from(h, (g) => 1e-4 + g * 0.2), m, r)
    });
    h.forEach((p, m) => {
      if (rnd() < p * 0.3) {
        playBuf(a.strikes[m % a.strikes.length], n + m * cue2.step + rnd() * cue2.step, {
          gain: 0.035 + 0.04 * p,
          rate: 1.8 + rnd() * 0.6,
          pan: (rnd() - 0.5) * 0.7,
          send: 0.35,
          big: 0.2,
          dur: 0.2
        });
      }
    });
  },
  release(cue2, e, t) {
    if (cue2.t < t - 0.05) return;
    const n = syn();
    const r = e + cue2.t;
    playBuf(n.burst, r, { gain: 0.75, rate: 0.85, send: 0.55, big: 1 });
    playBuf(n.strikes[0], r, { gain: 0.5, rate: 0.7, send: 0.4, big: 0.8 });
    thump({ f: 70, fEnd: 24, dur: 2.2, peak: 0.5, attack: 3e-3, send: 0.3, big: 0.9, drive: 2.4, t0: r });
    thump({ f: 110, fEnd: 45, dur: 0.6, peak: 0.28, attack: 2e-3, send: 0.2, big: 0.6, drive: 3, t0: r });
    playBuf(n.thunder, r + 0.02, { gain: 0.8, rate: 0.62, send: 0.3, big: 1, filter: { type: "lowpass", from: 1800, to: 500 } });
    playBuf(n.boom, r + 0.08, { gain: 0.9, rate: 0.7, send: 0.35, big: 1, filter: { type: "lowpass", from: 1200, to: 260 } });
    playBuf(n.boom, r + 0.9, { gain: 0.55, rate: 0.55, pan: -0.35, send: 0.5, big: 1, filter: { type: "lowpass", from: 700, to: 180 } });
    playBuf(n.thunder, r + 1.6, { gain: 0.4, rate: 0.5, pan: 0.4, send: 0.6, big: 1, filter: { type: "lowpass", from: 600, to: 150 } });
  },
  fill(cue2, e, t) {
    const { s: n, d: r } = cueWindow(cue2, e, t);
    if (r < 0.1) return;
    playBuf(syn().sizzle, n, {
      loop: true,
      rate: 0.9,
      dur: r + 0.6,
      send: 0.7,
      big: 0.8,
      filter: { type: "lowpass", from: 7e3, to: 700 },
      env: envPoints([[0.1, 0.09], [r + 0.6, 1e-4]])
    });
  },
  ignite(cue2, e, t) {
    if (cue2.t < t - 0.05) return;
    const n = e + cue2.t;
    thump({ f: 58, fEnd: 42, dur: 0.32, peak: 0.34, attack: 6e-3, send: 0.25, big: 0.55, t0: n });
    thump({ f: 54, fEnd: 40, dur: 0.28, peak: 0.24, attack: 6e-3, send: 0.25, big: 0.55, t0: n + 0.25 });
    playBuf(syn().hum, n + 0.3, {
      loop: true,
      rate: 0.5,
      dur: 2.4,
      send: 0.5,
      big: 0.8,
      filter: { type: "lowpass", from: 300, to: 900, q: 1.5 },
      env: envPoints([[0.8, 0.12], [2.4, 1e-4]])
    });
  }
};
var cuesLength = (cues) => cues.reduce((e, t) => Math.max(e, t.t + t.dur), 0);
function bolt({ pan = 0 } = {}) {
  ensureAudio();
  if (qe.state === "suspended") void qe.resume();
  const e = syn();
  const t = qe.currentTime + 0.06;
  const n = Math.max(-0.9, Math.min(0.9, pan));
  playBuf(e.strikes[Math.floor(rnd() * e.strikes.length)], t, {
    gain: 0.3,
    rate: 0.9 + rnd() * 0.3,
    pan: n,
    send: 0.45,
    big: 0.55
  });
  thump({ f: 90, fEnd: 46, dur: 0.25, peak: 0.08, send: 0.2, big: 0.45, t0: t });
  playBuf(e.sizzle, t + 0.05, {
    rate: 1.3,
    dur: 0.8,
    pan: n * 0.6,
    send: 0.45,
    big: 0.4,
    filter: { type: "highpass", from: 2600, to: 1200 },
    env: envPoints([[0.05, 0.14], [0.8, 1e-4]])
  });
}
function enable() {
  try {
    ensureAudio();
    syn();
    return true;
  } catch {
    return false;
  }
}
function stopCues() {
  if (trackVoices) {
    for (const i of trackVoices) {
      try {
        i.stop();
      } catch {
      }
    }
    trackVoices = null;
  }
}
function playCues(cues, at = 0) {
  stopCues();
  if (!Array.isArray(cues) || !cues.length) return;
  ensureAudio();
  if (qe.state === "suspended") void qe.resume();
  const t = performance.now();
  syn();
  at += (performance.now() - t) / 1e3;
  const n = qe.currentTime + 0.03 - at;
  trackVoices = [];
  try {
    for (const r of cues) {
      if (r.t + r.dur > at && CUE_KINDS[r.kind]) CUE_KINDS[r.kind](r, n, at);
    }
  } finally {
    trackVoices = null;
  }
}
var unlockTried = false;
function primeUnlock() {
  if (unlockTried || typeof window === "undefined") return;
  unlockTried = true;
  try {
    if (navigator.audioSession && !primed) {
      navigator.audioSession.type = "playback";
    }
  } catch {
  }
  try {
    const b = new ArrayBuffer(844);
    const dv = new DataView(b);
    const ascii = (o, a) => {
      for (let c = 0; c < a.length; c++) dv.setUint8(o + c, a.charCodeAt(c));
    };
    ascii(0, "RIFF");
    dv.setUint32(4, 836, true);
    ascii(8, "WAVEfmt ");
    dv.setUint32(16, 16, true);
    dv.setUint16(20, 1, true);
    dv.setUint16(22, 1, true);
    dv.setUint32(24, 8e3, true);
    dv.setUint32(28, 8e3, true);
    dv.setUint16(32, 1, true);
    dv.setUint16(34, 8, true);
    ascii(36, "data");
    dv.setUint32(40, 800, true);
    for (let o = 0; o < 800; o++) dv.setUint8(44 + o, 128);
    const r = new Audio(URL.createObjectURL(new Blob([b], { type: "audio/wav" })));
    r.loop = true;
    r.setAttribute("playsinline", "");
    r.volume = 0.01;
    void r.play().catch(() => {
    });
  } catch {
  }
}
function setRecording(on) {
  primed = Math.max(0, primed + (on ? 1 : -1));
  try {
    const s = navigator.audioSession;
    if (s) s.type = primed ? "play-and-record" : "playback";
  } catch {
  }
}
function unlockAudio() {
  try {
    primeUnlock();
    ensureAudio();
    if (qe.state === "suspended") void qe.resume();
    return qe.state;
  } catch {
    return "unavailable";
  }
}
function setSoundEnabled(on) {
  if (!qe || !hg) return;
  const t = qe.currentTime;
  hg.gain.cancelScheduledValues(t);
  hg.gain.setValueAtTime(hg.gain.value, t);
  hg.gain.linearRampToValueAtTime(on ? vN * 0.62 : 0, t + 0.12);
}
function contextState() {
  return qe ? qe.state : "none";
}
export {
  CUE_KINDS,
  HUMANOID,
  TIMING,
  VOICES,
  assembly,
  bolt,
  callRiser,
  contextState,
  cue,
  cuesLength,
  enable,
  ensureAudio,
  fmBlip,
  noiseSweep,
  playBuf,
  playCues,
  primeUnlock,
  setRecording,
  setSoundEnabled,
  stopCue,
  stopCues,
  syn,
  thump,
  tn,
  unlockAudio,
  voice
};
