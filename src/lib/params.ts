/**
 * lib/params — 82 parameter panel MIRA.
 * Sumber: recon/mira-params.json, yang isinya diverifikasi 82/82 terhadap blok literal
 * `{key:"…",group:"…",label:"…",min:…,max:…,step:…,def:…}` di bundle live
 * (recon/verify-mira.py → recon/mira-verified.json). JANGAN edit angka di sini
 * tanpa menjalankan ulang verifikasi itu.
 */
export interface Param {
  key: string
  scope: 'scene' | 'humanoid'
  stands: string | null
  group: string
  label: string
  min: number
  max: number
  step: number
  default: number
}

export const PARAMS: Param[] = [
  { key: "lines.count", scope: "scene", stands: null, group: "Centre lines", label: "How many lines", min: 2.0, max: 28.0, step: 1.0, default: 9.0 },
  { key: "lines.width", scope: "scene", stands: null, group: "Centre lines", label: "Line thickness (px)", min: 0.5, max: 4.0, step: 0.1, default: 1.4 },
  { key: "lines.glow", scope: "scene", stands: null, group: "Centre lines", label: "Line brightness", min: 0.0, max: 2.5, step: 0.05, default: 2.5 },
  { key: "lines.glowVar", scope: "scene", stands: null, group: "Centre lines", label: "Bright and dark stretches", min: 0.0, max: 1.0, step: 0.05, default: 1.0 },
  { key: "lines.hot", scope: "scene", stands: null, group: "Centre lines", label: "White hot spots", min: 0.0, max: 2.5, step: 0.05, default: 1.6 },
  { key: "lines.gold", scope: "scene", stands: null, group: "Centre lines", label: "Share of warm gold lines", min: 0.0, max: 0.6, step: 0.05, default: 0.6 },
  { key: "lines.rMin", scope: "scene", stands: null, group: "Centre lines", label: "Closest orbit (ring = 1)", min: 0.85, max: 1.6, step: 0.05, default: 0.95 },
  { key: "lines.rMax", scope: "scene", stands: null, group: "Centre lines", label: "Farthest orbit (ring = 1)", min: 1.2, max: 3.2, step: 0.05, default: 2.05 },
  { key: "lines.stretch", scope: "scene", stands: null, group: "Centre lines", label: "Oval stretch", min: 0.0, max: 1.0, step: 0.05, default: 0.0 },
  { key: "lines.chaos", scope: "scene", stands: null, group: "Centre lines", label: "Chaos of the shape", min: 0.0, max: 1.0, step: 0.05, default: 0.6 },
  { key: "lines.tilt", scope: "scene", stands: null, group: "Centre lines", label: "Tilt of the orbits (deg)", min: 0.0, max: 75.0, step: 1.0, default: 22.0 },
  { key: "lines.speed", scope: "scene", stands: null, group: "Centre lines", label: "Speed of the movement", min: 0.0, max: 3.0, step: 0.05, default: 3.0 },
  { key: "lines.cross", scope: "scene", stands: null, group: "Centre lines", label: "How deep lines cross the ring", min: 0.55, max: 1.0, step: 0.01, default: 0.86 },
  { key: "lines.follow", scope: "scene", stands: null, group: "Centre lines", label: "How softly they follow the ring size", min: 0.3, max: 6.0, step: 0.1, default: 2.9 },
  { key: "smoke.amount", scope: "scene", stands: null, group: "Smoke", label: "Smoke strength", min: 0.0, max: 2.0, step: 0.05, default: 0.95 },
  { key: "smoke.width", scope: "scene", stands: null, group: "Smoke", label: "Smoke width (ring = 1)", min: 0.04, max: 0.6, step: 0.01, default: 0.27 },
  { key: "dust.amount", scope: "scene", stands: null, group: "Star dust", label: "Grains per line", min: 0.0, max: 40.0, step: 1.0, default: 15.0 },
  { key: "dust.size", scope: "scene", stands: null, group: "Star dust", label: "Grain size", min: 0.4, max: 3.0, step: 0.05, default: 1.05 },
  { key: "dust.bright", scope: "scene", stands: null, group: "Star dust", label: "Grain brightness", min: 0.0, max: 2.5, step: 0.05, default: 2.5 },
  { key: "dust.spread", scope: "scene", stands: null, group: "Star dust", label: "How far grains sit from the line", min: 0.0, max: 0.5, step: 0.01, default: 0.5 },
  { key: "ring.diameter", scope: "scene", stands: null, group: "Ring and centre light", label: "Ring diameter (px)", min: 220.0, max: 420.0, step: 2.0, default: 310.0 },
  { key: "ring.neon", scope: "scene", stands: null, group: "Ring and centre light", label: "White neon on the ring", min: 0.0, max: 2.5, step: 0.05, default: 0.1 },
  { key: "ring.neonWidth", scope: "scene", stands: null, group: "Ring and centre light", label: "Neon thickness (px)", min: 0.6, max: 5.0, step: 0.1, default: 1.8 },
  { key: "ring.spill", scope: "scene", stands: null, group: "Ring and centre light", label: "Violet glow outside the ring", min: 0.0, max: 3.0, step: 0.05, default: 1.65 },
  { key: "light.bright", scope: "scene", stands: null, group: "Ring and centre light", label: "Centre light brightness", min: 0.0, max: 2.5, step: 0.05, default: 2.0 },
  { key: "light.size", scope: "scene", stands: null, group: "Ring and centre light", label: "Centre light size", min: 0.6, max: 3.0, step: 0.05, default: 2.2 },
  { key: "ring.listenWaves", scope: "scene", stands: null, group: "Ring and centre light", label: "Bright expanding circles while she listens (0 off, 1 on)", min: 0.0, max: 1.0, step: 1.0, default: 0.0 },
  { key: "voice.ring", scope: "scene", stands: null, group: "Her voice", label: "Ring flare per syllable", min: 0.0, max: 2.5, step: 0.05, default: 2.0 },
  { key: "voice.lines", scope: "scene", stands: null, group: "Her voice", label: "Lines react to her voice", min: 0.0, max: 2.5, step: 0.05, default: 1.95 },
  { key: "waves.opacity", scope: "scene", stands: null, group: "Far waves", label: "Far waves strength", min: 0.0, max: 1.0, step: 0.01, default: 0.36 },
  { key: "waves.width", scope: "scene", stands: null, group: "Far waves", label: "Far waves width", min: 0.2, max: 3.0, step: 0.05, default: 1.6 },
  { key: "waves.speed", scope: "scene", stands: null, group: "Far waves", label: "Far waves speed", min: 0.0, max: 3.0, step: 0.05, default: 3.0 },
  { key: "motes.opacity", scope: "scene", stands: null, group: "Floating particles", label: "Particle brightness", min: 0.0, max: 2.0, step: 0.05, default: 2.0 },
  { key: "motes.size", scope: "scene", stands: null, group: "Floating particles", label: "Particle size", min: 0.4, max: 3.0, step: 0.05, default: 1.0 },
  { key: "field.alpha", scope: "scene", stands: null, group: "Background", label: "Background field strength", min: 0.0, max: 1.0, step: 0.01, default: 1.0 },
  { key: "field.near", scope: "scene", stands: null, group: "Background", label: "Background haze near the ring", min: 0.0, max: 3.0, step: 0.05, default: 1.45 },
  { key: "field.spread", scope: "scene", stands: null, group: "Background", label: "Fog across the whole screen (0 = only near the ring)", min: 0.0, max: 1.0, step: 0.01, default: 0.0 },
  { key: "bloom.strength", scope: "scene", stands: null, group: "Glow (whole picture)", label: "Glow strength", min: 0.0, max: 3.0, step: 0.05, default: 1.3 },
  { key: "bloom.threshold", scope: "scene", stands: null, group: "Glow (whole picture)", label: "Only brighter than this glows", min: 0.0, max: 1.0, step: 0.01, default: 0.18 },
  { key: "bloom.radius", scope: "scene", stands: null, group: "Glow (whole picture)", label: "Glow reach", min: 0.1, max: 1.0, step: 0.01, default: 0.62 },
  { key: "hum.hair.light", scope: "humanoid", stands: null, group: "Her hair", label: "Hair brightness", min: 0.0, max: 2.5, step: 0.05, default: 1.0 },
  { key: "hum.head.follow", scope: "humanoid", stands: null, group: "Her head", label: "How far she turns toward you", min: 0.0, max: 2.0, step: 0.05, default: 1.0 },
  { key: "hum.head.life", scope: "humanoid", stands: null, group: "Her head", label: "How much she moves on her own", min: 0.0, max: 2.0, step: 0.05, default: 1.0 },
  { key: "hum.head.speed", scope: "humanoid", stands: null, group: "Her head", label: "How quickly she turns", min: 0.3, max: 3.0, step: 0.05, default: 1.0 },
  { key: "hum.state.talkSpeed", scope: "humanoid", stands: null, group: "Her states", label: "How much faster everything moves while she talks", min: 1.0, max: 4.0, step: 0.05, default: 2.0 },
  { key: "hum.state.talkBright", scope: "humanoid", stands: null, group: "Her states", label: "How much brighter she is while she talks", min: 1.0, max: 2.5, step: 0.05, default: 1.35 },
  { key: "hum.state.listenSpeed", scope: "humanoid", stands: null, group: "Her states", label: "How much faster everything moves while she listens", min: 1.0, max: 4.0, step: 0.05, default: 1.5 },
  { key: "hum.state.listenBright", scope: "humanoid", stands: null, group: "Her states", label: "How much brighter she is while she listens", min: 1.0, max: 2.5, step: 0.05, default: 1.15 },
  { key: "hum.face.glow", scope: "humanoid", stands: null, group: "Her face", label: "Face light while she speaks", min: 0.0, max: 3.0, step: 0.05, default: 1.0 },
  { key: "hum.face.warmth", scope: "humanoid", stands: null, group: "Her face", label: "Face light edge colour (0 her lilac, 1 her gold)", min: 0.0, max: 1.0, step: 0.05, default: 0.0 },
  { key: "hum.face.size", scope: "humanoid", stands: null, group: "Her face", label: "Face light size", min: 0.3, max: 2.5, step: 0.05, default: 1.0 },
  { key: "hum.face.move", scope: "humanoid", stands: null, group: "Her face", label: "Face movement while she speaks", min: 0.0, max: 3.0, step: 0.05, default: 1.0 },
  { key: "hum.hair.glow", scope: "humanoid", stands: null, group: "Her hair", label: "Hair glow when she listens or speaks", min: 0.0, max: 4.0, step: 0.05, default: 1.5 },
  { key: "hum.hair.moving", scope: "humanoid", stands: null, group: "Her hair", label: "How many strands move on their own", min: 0.0, max: 60.0, step: 1.0, default: 60.0 },
  { key: "hum.hair.mass", scope: "humanoid", stands: null, group: "Her hair", label: "How much the whole hair sways", min: 0.0, max: 2.0, step: 0.05, default: 0.7 },
  { key: "hum.hair.top", scope: "humanoid", stands: null, group: "Her hair", label: "How much the hair over her head moves", min: 0.0, max: 2.0, step: 0.05, default: 0.6 },
  { key: "hum.hair.swayAmt", scope: "humanoid", stands: null, group: "Her hair", label: "How far they sway", min: 0.0, max: 1.5, step: 0.01, default: 0.6 },
  { key: "hum.hair.swaySpeed", scope: "humanoid", stands: null, group: "Her hair", label: "How fast they sway", min: 0.0, max: 2.0, step: 0.05, default: 0.45 },
  { key: "hum.hair.pulse", scope: "humanoid", stands: null, group: "Her hair", label: "Light running down the moving strands", min: 0.0, max: 2.0, step: 0.05, default: 0.6 },
  { key: "hum.hair.twinkle", scope: "humanoid", stands: null, group: "Her hair", label: "Sparkles twinkling in the hair", min: 0.0, max: 2.0, step: 0.05, default: 0.6 },
  { key: "hum.lines.bright", scope: "humanoid", stands: null, group: "Her lines at rest", label: "Her lines over the picture", min: 0.0, max: 1.5, step: 0.05, default: 0.15 },
  { key: "hum.lines.glow", scope: "humanoid", stands: null, group: "Her lines at rest", label: "Soft glow around her lines", min: 0.0, max: 3.0, step: 0.05, default: 1.0 },
  { key: "hum.lines.pulse", scope: "humanoid", stands: null, group: "Her lines at rest", label: "Light travelling along her lines", min: 0.0, max: 2.0, step: 0.05, default: 0.7 },
  { key: "hum.lines.pulseSpeed", scope: "humanoid", stands: null, group: "Her lines at rest", label: "Speed of that light", min: 0.1, max: 3.0, step: 0.05, default: 1.0 },
  { key: "hum.body.bright", scope: "humanoid", stands: null, group: "Her lines at rest", label: "Her picture brightness", min: 0.5, max: 1.6, step: 0.05, default: 1.0 },
  { key: "hum.aura", scope: "humanoid", stands: null, group: "Her lines at rest", label: "Violet light behind her head", min: 0.0, max: 2.0, step: 0.05, default: 0.8 },
  { key: "hum.breath.depth", scope: "humanoid", stands: null, group: "Her breathing", label: "How deep she breathes", min: 0.0, max: 3.0, step: 0.05, default: 1.0 },
  { key: "hum.breath.speed", scope: "humanoid", stands: null, group: "Her breathing", label: "How fast she breathes", min: 0.3, max: 2.5, step: 0.05, default: 1.0 },
  { key: "hum.build.core", scope: "humanoid", stands: null, group: "The build", label: "The core at her heart (brightness)", min: 0.0, max: 3.0, step: 0.05, default: 1.0 },
  { key: "hum.build.matter", scope: "humanoid", stands: null, group: "The build", label: "Her matter in flight (brightness)", min: 0.0, max: 3.0, step: 0.05, default: 1.0 },
  { key: "hum.build.shock", scope: "humanoid", stands: null, group: "The build", label: "The wave at her ignition", min: 0.0, max: 3.0, step: 0.05, default: 1.0 },
  { key: "hum.build.surge", scope: "humanoid", stands: null, group: "The build", label: "How bright she burns at ignition", min: 0.0, max: 3.0, step: 0.05, default: 1.0 },
  { key: "hum.strike.flash", scope: "humanoid", stands: null, group: "Lightning", label: "How much a strike lights the room", min: 0.0, max: 1.5, step: 0.01, default: 0.38 },
  { key: "hum.strike.bright", scope: "humanoid", stands: null, group: "Lightning", label: "Bolt brightness", min: 0.2, max: 2.0, step: 0.05, default: 1.0 },
  { key: "hum.touch.wave", scope: "humanoid", stands: null, group: "Lightning", label: "Current through her when you touch or pinch", min: 0.0, max: 3.0, step: 0.05, default: 1.0 },
  { key: "hum.fog.spread", scope: "humanoid", stands: "field.spread", group: "Fog and far waves", label: "Fog across the whole screen", min: 0.0, max: 1.0, step: 0.01, default: 0.85 },
  { key: "hum.fog.amount", scope: "humanoid", stands: "field.alpha", group: "Fog and far waves", label: "Fog strength", min: 0.0, max: 1.0, step: 0.01, default: 1.0 },
  { key: "hum.waves.opacity", scope: "humanoid", stands: "waves.opacity", group: "Fog and far waves", label: "Far waves strength", min: 0.0, max: 1.0, step: 0.01, default: 0.3 },
  { key: "hum.waves.speed", scope: "humanoid", stands: "waves.speed", group: "Fog and far waves", label: "Far waves speed", min: 0.0, max: 3.0, step: 0.05, default: 0.6 },
  { key: "hum.glow.strength", scope: "humanoid", stands: "bloom.strength", group: "Glow (her whole picture)", label: "Glow strength", min: 0.0, max: 3.0, step: 0.05, default: 0.9 },
  { key: "hum.glow.threshold", scope: "humanoid", stands: "bloom.threshold", group: "Glow (her whole picture)", label: "Only brighter than this glows", min: 0.0, max: 1.0, step: 0.01, default: 0.6 },
  { key: "hum.glow.radius", scope: "humanoid", stands: "bloom.radius", group: "Glow (her whole picture)", label: "Glow reach", min: 0.1, max: 1.0, step: 0.01, default: 0.62 },
]

/** 20 seksi berurutan; `Her hair` memang muncul dua kali (seksi 10 & 14). */
export const SECTIONS: { group: string; params: Param[] }[] = PARAMS.reduce(
  (acc, p) => {
    const last = acc[acc.length - 1]
    if (last && last.group === p.group) last.params.push(p)
    else acc.push({ group: p.group, params: [p] })
    return acc
  },
  [] as { group: string; params: Param[] }[]
)

/** 7 alias `stands`: humanoid → scene */
export const ALIASES: Record<string, string> = Object.fromEntries(
  PARAMS.filter((p) => p.stands).map((p) => [p.key, p.stands as string])
)
