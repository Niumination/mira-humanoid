#version 300 es

#define attribute in
#define varying out
#define texture2D texture
precision highp float;
	precision highp int;
	precision highp sampler2D;
	precision highp samplerCube;
	precision highp sampler3D;
	precision highp sampler2DArray;
	precision highp sampler2DShadow;
	precision highp samplerCubeShadow;
	precision highp sampler2DArrayShadow;
	precision highp isampler2D;
	precision highp isampler3D;
	precision highp isamplerCube;
	precision highp isampler2DArray;
	precision highp usampler2D;
	precision highp usampler3D;
	precision highp usamplerCube;
	precision highp usampler2DArray;
	
#define HIGH_PRECISION
#define SHADER_TYPE ShaderMaterial
#define SHADER_NAME 
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
#ifdef USE_INSTANCING
	attribute mat4 instanceMatrix;
#endif
#ifdef USE_INSTANCING_COLOR
	attribute vec3 instanceColor;
#endif
#ifdef USE_INSTANCING_MORPH
	uniform sampler2D morphTexture;
#endif
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
#ifdef USE_UV1
	attribute vec2 uv1;
#endif
#ifdef USE_UV2
	attribute vec2 uv2;
#endif
#ifdef USE_UV3
	attribute vec2 uv3;
#endif
#ifdef USE_TANGENT
	attribute vec4 tangent;
#endif
#if defined( USE_COLOR_ALPHA )
	attribute vec4 color;
#elif defined( USE_COLOR )
	attribute vec3 color;
#endif
#ifdef USE_SKINNING
	attribute vec4 skinIndex;
	attribute vec4 skinWeight;
#endif


  attribute vec3 aCol; attribute float aTArr; attribute float aFly; attribute float aTurns; attribute float aSeed; attribute float aStay; attribute float aTRev;
  uniform float uTime, uPx, uSettle, uLiveT, uBright, uMatter, uCoreA, uLag, uTrail, uDense;
  varying vec3 vCol; varying float vA; varying float vMove;

  uniform vec4 uCoreT;     // the spark (start, end), the weave (start, end) - s
  uniform vec3 uCore;      // her heart (x, y px), the core's radius (px)
  float coreK(float t) { return smoothstep(uCoreT.x + 0.05, uCoreT.y, t) * (1.0 - 0.6 * smoothstep(uCoreT.z, uCoreT.w, t)); }
  vec2 orbitAt(vec2 seat, float seed, float turns, float t0, float t) {
    vec2 d = seat - uCore.xy;
    float a = atan(d.y, d.x) - 6.2831853 * turns - 2.200 * (t0 - t);
    float lift = smoothstep(t0 - 0.35, t0, t);
    float r = uCore.z * coreK(t) * ((0.2 + 0.7 * sqrt(fract(seed * 7.0))) * (1.0 - lift) + lift) * (1.0 + 0.12 * sin(t * (3.0 + 4.0 * fract(seed * 13.0)) + seed * 40.0));
    return uCore.xy + vec2(cos(a), sin(a)) * r;
  }
  vec2 flightAt(vec2 seat, float seed, float turns, float t0, float u) {
    vec2 s = orbitAt(seat, seed, turns, t0, t0) - uCore.xy, d = seat - uCore.xy;
    float r0 = length(s), r1 = length(d), a0 = atan(s.y, s.x), a1 = atan(d.y, d.x);
    float span = 6.2831853 * turns;
    float da = a1 - a0; da -= 6.2831853 * floor((da - span) / 6.2831853 + 0.5);
    float et = 1.0 - pow(1.0 - u, 2.2), er = u * u * (3.0 - 2.0 * u);
    float r = mix(r0, r1, er) * (1.0 + 0.140 * sin(3.14159265 * u)), a = a0 + da * et;
    return uCore.xy + vec2(cos(a), sin(a)) * r;
  }

  uniform vec4 uShock;     // where it started (x, y px), the wave's radius (px), its strength
  uniform float uShockW;   // the width of its band of light (px): her ignition's front is thin, a touch's is broad
  // the light of the wave's front where it crosses p
  float shockAt(vec2 p) { float d = length(p - uShock.xy) - uShock.z; float w = uShockW + 0.02 * uShock.z; return uShock.w * exp(-d * d / (w * w)); }

  uniform vec4 uFace;    // her face: centre x, centre y, half width, half height (picture px)
  uniform vec4 uFaceA;   // the light's level, the movement (px), its clock (s), the warmth (0 her violet .. 1 her gold)
  uniform float uFaceSize;   // the light's size (1 = FACE_LIGHT as written; the dial "Face light size")
  vec2 faceQ(vec2 p) { return (p - uFace.xy) / max(uFace.zw, vec2(1.0)); }
  float faceMask(vec2 p) { return 1.0 - smoothstep(0.62, 1.0, length(faceQ(p))); }
  vec2 faceMove(vec2 p) {
    if (uFaceA.y <= 0.0) return vec2(0.0);
    vec2 q = faceQ(p);
    float m = faceMask(p);
    if (m <= 0.0) return vec2(0.0);
    float T = uFaceA.z;
    // Apex's speaking wave, ported: the rows of her face slide sideways in a travelling double wave
    float wv = sin(T * 9.2 + q.y * 8.3) * sin(T * 3.7 + q.y * 3.4);
    // and rings spread out from the light in the front of her face
    vec2 c = q - vec2(0.0000, 0.0400);
    float r = length(c);
    float ring = sin(r * 16.0 - T * 7.5) * exp(-r * 1.8);
    vec2 dir = r > 1e-4 ? c / r : vec2(0.0);
    return (vec2(wv, 0.0) + dir * ring * 0.45) * uFaceA.y * m;
  }
  // one part of the spindle (faceLightAt): widest at its middle, narrowing to its ends, dimmer toward them
  float faceSpindle(vec2 c, float width, float reach, float weight) {
    float prof = max(0.0, 1.0 - pow(abs(c.y) / (0.8200 * reach), 1.5000));
    if (prof <= 0.0) return 0.0;
    float hw = width * pow(prof, 0.7);
    return weight * pow(prof, 0.6) * exp(-(c.x / hw) * (c.x / hw));
  }
  float faceGlow(vec2 p) {
    if (uFaceA.x <= 0.0) return 0.0;
    vec2 c = (faceQ(p) - vec2(0.0000, 0.0400)) / max(0.05, uFaceSize);
    float g = 0.0;
    g += faceSpindle(c, 0.2100, 0.9200, 1.2500);
    g += faceSpindle(c, 0.4500, 1.0000, 0.5500);
    g += faceSpindle(c, 0.7600, 1.1200, 0.1600);
    return uFaceA.x * g * faceMask(p);
  }
  vec3 faceColor(vec2 p) {
    // white along the spindle's middle, its edge colour out at its sides and toward its ends
    vec2 c = (faceQ(p) - vec2(0.0000, 0.0400)) / max(0.05, uFaceSize);
    float prof = max(0.0, 1.0 - pow(min(1.0, abs(c.y) / 0.8200), 1.5000));
    float k = smoothstep(0.0, 1.0, max(abs(c.x) / max(0.02, 0.4500 * pow(prof, 0.7)), 1.0 - prof));
    vec3 violet = mix(vec3(1.0000, 1.0000, 1.0000), vec3(0.8600, 0.7600, 1.0000), k);
    vec3 gold = mix(vec3(1.0000, 1.0000, 1.0000), vec3(1.0000, 0.7200, 0.3600), k);
    // (written as they should LOOK and converted to light: the glow pass brightens everything for the screen at the
    // end, which turned colours written directly into a washed-out beige)
    return pow(mix(violet, gold, uFaceA.w), vec3(2.2));
  }
  // how much her own glass face brightens under the light (her picture's own colours, lit from inside)
  float faceLift(vec2 p) { return faceGlow(p) * 2.4000; }

  vec3 headRotate(vec3 h, float yaw, float pitch, float roll) {
    float cy = cos(yaw), sy = sin(yaw), cp = cos(pitch), sp = sin(pitch), cr = cos(roll), sr = sin(roll);
    vec3 a = vec3(h.x * cy + h.z * sy, h.y, -h.x * sy + h.z * cy);
    a = vec3(a.x, a.y * cp + a.z * sp, -a.y * sp + a.z * cp);
    a = vec3(a.x * cr - a.y * sr, a.x * sr + a.y * cr, a.z);
    return a;
  }
  vec3 headRotateUp(vec3 h, float yaw, float pitch, float roll) { vec3 a = headRotate(vec3(h.x, -h.y, h.z), yaw, pitch, roll); return vec3(a.x, -a.y, a.z); }
  // how much a turn has happened (Apex's thresholds): the points grow with it so no gap opens (round 4), and the
  // turned head's light comes in with it
  float headTurnK(float yaw, float pitch) { return smoothstep(0.05, 0.45, abs(yaw) + abs(pitch)); }
  float headShadeK(float yaw, float pitch) { return smoothstep(0.06, 0.30, abs(yaw) + abs(pitch) * 1.2); }
  float headCover(float turnK) { return 1.0 + turnK * 0.9; }
  // THE TURNED HEAD'S LIGHT (Apex rounds 20-22): the far side is a shadow not a smear, the edge glows as the profile
  // line, what turns behind recedes into shade. nx = the surface's sideways facing, back = 1 for the back of the head,
  // zn = how far toward you (-1 .. 1).
  vec3 headShade(vec3 tint, float nx, float back, float yaw, float effK, float rimK, float zn) {
    float nnx = nx;
    float nnz = sqrt(max(0.0, 1.0 - nnx * nnx));
    if (back > 0.5) nnz = -nnz;
    float sy2 = sin(yaw), cy2 = cos(yaw);
    float nvz = -nnx * sy2 + nnz * cy2;
    float facing = 0.08 + 0.92 * smoothstep(-0.05, 0.45, nvz);
    tint *= mix(1.0, facing, effK);
    float rim = 1.0 - smoothstep(0.04, 0.30, abs(nvz));
    tint *= 1.0 + rim * effK * rimK;
    float zc = clamp(zn, -1.0, 1.0);
    tint *= mix(1.0, 0.72 + 0.28 * smoothstep(-0.6, 0.6, zc), effK);
    return tint;
  }

  uniform sampler2D uHeadRows;    // rowTexture: centre x, half width, turn weight, depth share - one texel per picture row
  uniform float uHeadH;           // the picture's height (rows)
  uniform vec4 uHeadPose;         // yaw, pitch, roll (radians), 0
  uniform vec3 uHeadPivot;        // the point the head turns about (picture px, z toward you)
  vec4 headRow(float y) { return texture2D(uHeadRows, vec2(0.5, (clamp(y, 0.0, uHeadH - 1.0) + 0.5) / uHeadH)); }
  // (z on the round head, turn weight, facing direction u, inside 0/1)
  vec4 headInfo(vec2 p) {
    vec4 r = headRow(p.y);
    float u = (p.x - r.x) / max(r.y, 1.0);
    float inside = step(abs(u), 1.0) * step(0.5, r.y);
    return vec4(r.w * r.y * sqrt(max(0.0, 1.0 - u * u)) * inside, r.z, clamp(u, -1.0, 1.0), inside);
  }
  // a SOFT shell for light layers (hair): over the head it IS the head (hair over her skull moves exactly with it); near
  // the edge, where the round head stands straight up, it leans away at a steady slope instead and is flat beyond -
  // so a layer on it never folds over itself or tears where the head's edge turns
  float softShell(float a) { return a <= 0.800 ? sqrt(1.0 - a * a) : max(0.0, 0.6000 - 1.3333 * (a - 0.800)); }
  float headSoftZ(vec2 p) { vec4 r = headRow(p.y); return r.w * r.y * softShell(abs((p.x - r.x) / max(r.y, 1.0))); }
  float headWeight(vec2 p) { return headRow(p.y).z; }
  // a rest point (picture px, z) moved by the head's turn, weighted by how much its height turns with the head
  vec3 headTurn(vec3 r, float w) {
    if (w <= 0.0) return r;
    vec3 h = r - uHeadPivot;
    return r + (headRotate(h, uHeadPose.x, uHeadPose.y, uHeadPose.z) - h) * w;
  }
  // where the point p of the picture is now, on the round head, lifted toward you by "lift" px
  vec3 headPlace(vec2 p, float lift) { vec4 i = headInfo(p); return headTurn(vec3(p, i.x + lift), i.y); }
  // the same on the soft shell (hair)
  vec3 headPlaceSoft(vec2 p, float lift) { return headTurn(vec3(p, headSoftZ(p) + lift), headWeight(p)); }

  vec4 headClip(vec3 p) { vec4 c = projectionMatrix * modelViewMatrix * vec4(p.xy, 0.0, 1.0); c.z -= p.z * 1.0e-5 * c.w; return c; }

  void main() {
    // (a TRAIL copy draws the same matter a moment earlier - uLag - fainter, only in flight: light streaks behind it)
    float tm = uTime - uLag;
    float t0 = aTArr - aFly, u = clamp((tm - t0) / aFly, 0.0, 1.0);
    bool waiting = tm < t0;
    bool landed = tm >= aTArr;
    vec2 seat = position.xy;
    vec2 xy = waiting ? orbitAt(seat, aSeed, aTurns, t0, tm) : (landed ? seat : flightAt(seat, aSeed, aTurns, t0, u));
    float on = landed ? 1.0 : 0.0;
    xy += faceMove(xy) * on;                        // (once it sits on her face, it moves with it)
    // a wave of current (her ignition's, or a touch's - lib/miraBuild touchWave) makes the specks it crosses jump and
    // flare
    float sh = on * shockAt(xy);
    xy += normalize(xy - uShock.xy + vec2(1e-3, 0.0)) * sh * 6.0;
    vec2 local = xy;                                // (where it sits on her, before her head turns it)
    vec3 hp = mix(vec3(xy, 0.0), headPlace(xy, 2.0), on);   // her head turns (lib/figureHead3d)
    gl_Position = headClip(hp);
    float tw = 0.65 + 0.35 * sin(uLiveT * (1.0 + aSeed * 1.6) + aSeed * 20.0);   // (her pace clock)
    float flight = (waiting || landed) ? 0.0 : 1.0;
    float land = landed ? exp(-(tm - aTArr) * 14.0) : 0.0;             // a small flash where it lands
    // (a seat holds her shape until her ignition's wave reaches it, then melts into her picture - lib/miraBuild revealAt)
    float melt = aStay > 0.5 ? 1.0 : 1.0 - smoothstep(aTRev, aTRev + 0.35, tm);
    vMove = flight * sin(3.14159265 * u) + land;
    // (in the core each particle is small and dim, so thousands of them read as boiling plasma, not a blob - and the
    // more of them there are, the less light each one carries: uDense)
    float settled = mix(1.0, uSettle * tw, smoothstep(aTArr, aTArr + 0.6, tm));
    float held = mix(1.0, 0.8 * tw, smoothstep(aTArr, aTArr + 0.6, tm)) * melt;   // (twinkling softly while it holds her shape)
    vA = waiting ? uCoreA * uDense * coreK(tm) : (landed ? (aStay > 0.5 ? settled : held) : 0.9 * sqrt(uDense));
    if (uLag > 0.0 && flight < 0.5) vA = 0.0;
    vA *= uTrail;
    gl_PointSize = uPx * (waiting ? 1.1 : (1.2 + 1.0 * vMove)) * (0.7 + aSeed * 0.6) * (uLag > 0.0 ? 0.8 : 1.0);
    // hot violet-white the instant it leaves the core, its own colour on the way, brighter in flight
    vec3 hot = vec3(0.92, 0.82, 1.0);
    vCol = waiting ? mix(hot, aCol, 0.4) : mix(hot, aCol, smoothstep(0.0, 0.2, u)) * (1.1 + 0.9 * flight * uMatter) + vec3(1.0, 0.95, 1.0) * land * 1.5;
    // the dust on her face catches the glow in its front while she speaks (lib/miraFace)
    vCol += faceColor(local) * faceGlow(local) * 1.4 * on;
    vCol += vec3(0.9, 0.75, 1.0) * sh * 1.6;
    vCol *= mix(1.0, uBright, on);                  // brighter while she talks or listens (lib/miraPace)
  }
