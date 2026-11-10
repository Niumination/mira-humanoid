// src/lib/miraTimeline.ts
var IGNITE_CFG = {
  spark: [0, 0.9],
  weave: [0.9, 6],
  accel: 0.72,
  arms: 2,
  spin: 0.15,
  twist: 7,
  reachBins: 180,
  flight: [1.5, 0.65],
  launch: 0.75,
  turns: [0.5, 0.68],
  coreSpin: 2.2,
  bulge: 0.14,
  coreR: 0.05,
  hush: 0.55,
  wave: 1,
  coreArcs: 18,
  crownArcs: 10,
  seats: 36e3,
  hairSeats: 14e3,
  matterRef: 16e3,
  view: [-0.9, 1.9, -0.25, 1]
};

// src/lib/miraSoundCues.ts
function buildCueTracks({
  arcs,
  particles,
  star,
  width,
  cfg = IGNITE_CFG
}) {
  const panOf = (x) => Math.max(-0.9, Math.min(0.9, (x - star.x) / (0.75 * width)));
  const out = [];
  const a = cfg.weave[1];
  out.push({ kind: "gather", t: cfg.spark[0] + 0.05, dur: cfg.spark[1] - cfg.spark[0] });
  out.push({ kind: "hum", t: cfg.spark[0] + 0.3, dur: a - cfg.spark[0] - 0.3 });
  out.push({ kind: "boil", t: cfg.spark[1] - 0.2, dur: a - cfg.spark[1] + 0.2 });
  const c = 0.05;
  const h = Math.max(1, Math.round((a - cfg.weave[0]) / c));
  const p = new Array(h).fill(0);
  for (const g of particles) {
    const v = Math.floor((g.tArr - cfg.weave[0]) / c);
    if (v >= 0 && v < h) p[v]++;
  }
  const m = Math.max(1, ...p);
  out.push({ kind: "needle", t: cfg.weave[0], dur: h * c, step: c, busy: p.map((g) => Math.sqrt(g / m)) });
  for (const g of arcs) {
    out.push({ kind: "strike", t: g.t, dur: 0.35, strength: g.strength * (g.kind === "core" ? 0.7 : 1.1), pan: panOf(g.x) });
  }
  out.push({ kind: "gather", t: a - 2.2, dur: 2.2 });
  const ignite = a + cfg.hush;
  out.push({ kind: "release", t: ignite, dur: 6 });
  out.push({ kind: "ignite", t: ignite + 0.05, dur: 3 });
  out.push({ kind: "fill", t: ignite + 0.2, dur: 1.4 });
  out.sort((g, v) => g.t - v.t);
  return out;
}
export {
  buildCueTracks
};
