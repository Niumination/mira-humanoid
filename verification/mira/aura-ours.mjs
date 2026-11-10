// src/lib/miraAura.ts
var presenceSet = false;
var up = { input: 0, output: 0 };
var Rn = { mira: 0, orb: 0, matter: 0, routes: 1, live: false, voice: 0, talk: 0, listen: 0, pace: 1 };
var aura = () => Rn;
function clearAura() {
  presenceSet = false;
  pinned = null;
  for (const k of ["mira", "orb", "matter", "voice", "talk", "listen"]) Rn[k] = 0;
  Rn.routes = 1;
  Rn.live = false;
  Rn.pace = 1;
  up.input = 0;
  up.output = 0;
}
function setPace(i) {
  Rn.pace = i > 0.2 && i < 6 ? i : 1;
}
function pinAura(i) {
  pinned = i;
  Rn.voice = i ? i.voice ?? 0 : 0;
  Rn.talk = i ? i.talk ?? 0 : 0;
  Rn.listen = i ? i.listen ?? 0 : 0;
}
var pinned = null;
function updateAura(dt, { energy = 0, speaking = false, listening = false } = {}) {
  if (pinned) {
    Rn.voice = pinned.voice ?? 0;
    Rn.talk = pinned.talk ?? 0;
    Rn.listen = pinned.listen ?? 0;
    return Rn;
  }
  const r = Math.min(Math.max(dt || 0, 0), 0.1);
  const o = speaking ? Math.min(1, Math.max(0, energy)) : 0;
  Rn.voice += (o - Rn.voice) * Math.min(1, r * (o > Rn.voice ? 28 : 7));
  const a = speaking ? 1 : 0;
  Rn.talk += (a - Rn.talk) * Math.min(1, r * (a > Rn.talk ? 10 : 2.2));
  const c = listening && !speaking ? 1 : 0;
  Rn.listen += (c - Rn.listen) * Math.min(1, r * 4);
  if (Rn.voice < 0.01) Rn.voice = 0;
  if (Rn.talk < 0.01) Rn.talk = 0;
  if (Rn.listen < 0.01) Rn.listen = 0;
  return Rn;
}
var Xy = (i) => i < 0 ? 0 : i > 1 ? 1 : i;
function setPresence(i) {
  if (!i) {
    if (!presenceSet) return;
    presenceSet = false;
    Rn.mira = 0;
    Rn.orb = 0;
    Rn.matter = 0;
    return;
  }
  presenceSet = true;
  Rn.mira = Xy(i.waves ?? 0);
  Rn.orb = Xy(i.orb ?? 0);
  Rn.matter = Xy(i.matter ?? 0);
}
var JU = (i) => Math.max(0, Math.min(1, Number(i) || 0));
function setLevel(name, v) {
  if (name in up) up[name] = JU(v);
}
function level(name) {
  return up[name] || 0;
}
function clearLevel(name) {
  if (name in up) up[name] = 0;
}
var herStateParams = (get) => ({
  talkSpeed: get("hum.state.talkSpeed"),
  talkBright: get("hum.state.talkBright"),
  listenSpeed: get("hum.state.listenSpeed"),
  listenBright: get("hum.state.listenBright")
});
var tx = (i) => Math.max(0, Math.min(1, i || 0));
function herSpeedBright(s, p) {
  const t = tx(s.talk || 0);
  const n = tx(s.listen || 0) * (1 - t);
  const r = tx(s.voice || 0);
  return {
    speed: 1 + (p.talkSpeed - 1) * t + (p.listenSpeed - 1) * n,
    bright: 1 + (p.talkBright - 1) * t * (0.7 + 0.6 * r) + (p.listenBright - 1) * n
  };
}
var TOUCH = { quicken: 1.5 };
function touchRate(ht) {
  return ht >= 0 && ht < 3 ? 1 + TOUCH.quicken * Math.exp(-ht / 0.6) : 1;
}
function talkLevel(t) {
  if (t / 1.9 % 1 > 0.78) return 0.04;
  const d = Math.max(0, Math.sin(t * 2 * Math.PI * 4.1));
  return Math.min(1, 0.15 + 0.85 * Math.pow(d, 1.4) * (0.65 + 0.35 * Math.sin(t * 1.7)));
}
export {
  TOUCH,
  aura,
  clearAura,
  clearLevel,
  herSpeedBright,
  herStateParams,
  level,
  pinAura,
  setLevel,
  setPace,
  setPresence,
  talkLevel,
  touchRate,
  updateAura
};
