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


  attribute vec2 aRest; attribute float aKind; attribute float aZ;
  uniform float uStep, uPxPerPic, uBackK, uRim, uOn, uZRef;
  varying vec2 vRest; varying float vPatch; varying vec3 vTint; varying float vKind; varying float vShow;

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
    vRest = aRest; vKind = aKind; vTint = vec3(1.0); vShow = uOn;
    vec4 hi = headInfo(aRest);
    bool back = aKind > 0.5 && aKind < 1.5;
    bool dust = aKind > 4.5;
    float z = back ? -hi.x * 0.85 : (dust ? aZ * hi.x : hi.x);
    vec3 p = headTurn(vec3(aRest + faceMove(aRest), z), hi.y);
    float cover = headCover(headTurnK(uHeadPose.x, uHeadPose.y) * hi.y);          // (shared with Apex - lib/figureHead3d)
    float effK = headShadeK(uHeadPose.x, uHeadPose.y) * hi.y * hi.w;
    if (effK > 0.001 && !dust) vTint = headShade(vTint, hi.z, back ? 1.0 : 0.0, uHeadPose.x, effK, uRim, p.z / max(1.0, uZRef) * 1.6);
    if (back) { vShow *= step(0.01, uBackK); vTint *= 0.5; }
    if (dust) vShow *= step(0.01, uBackK);
    gl_Position = headClip(p);
    gl_PointSize = uStep * 2.0 * cover * uPxPerPic;
    vPatch = uStep * 2.0 * cover;
  }
