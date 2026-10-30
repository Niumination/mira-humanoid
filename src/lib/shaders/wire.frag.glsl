#version 300 es
#define varying in
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
#define gl_FragDepthEXT gl_FragDepth
#define texture2D texture
#define textureCube texture
#define texture2DProj textureProj
#define texture2DLodEXT textureLod
#define texture2DProjLodEXT textureProjLod
#define textureCubeLodEXT textureLod
#define texture2DGradEXT textureGrad
#define texture2DProjGradEXT textureProjGrad
#define textureCubeGradEXT textureGrad
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
#define DOUBLE_SIDED
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;

const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 linearToOutputTexel( vec4 value ) { return ( LinearTransferOETF( value ) ); }
float luminance( const in vec3 rgb ) {
	const vec3 weights = vec3( 0.2126, 0.7152, 0.0722 );
	return dot( weights, rgb );
}


  precision highp float;
  uniform float uTime, uHalfPx, uCorePx, uSoftLine, uSoftSketch, uGlowLine, uGlowSketch;
  uniform float uRest, uSettle, uHot, uGain, uIdle, uPulse, uPulseSpeed, uSketchBright, uFade, uTaper, uLiveT;
  varying vec2 vUv; varying float vT; varying vec3 vCol; varying float vS; varying float vLen; varying float vId; varying float vSketch; varying float vEnd; varying vec2 vPos; varying float vF;

  uniform vec4 uHz;                  // her centre line x, her ear top y, feather (px), how much (0..1)
  uniform vec3 uHzSkull, uHzInner;   // half width, centre y, half height (px)
  float underHair(vec2 p) {
    if (uHz.w <= 0.0) return 0.0;
    vec2 qs = vec2((p.x - uHz.x) / uHzSkull.x, (p.y - uHzSkull.y) / uHzSkull.z);
    float skull = p.y < uHzSkull.y ? length(qs) : abs(qs.x);
    float inSkull = 1.0 - smoothstep(1.0, 1.0 + uHz.z / uHzSkull.x, skull);
    vec2 qi = vec2((p.x - uHz.x) / uHzInner.x, (p.y - uHzInner.y) / uHzInner.z);
    float outInner = smoothstep(1.0 - 2.0 * uHz.z / uHzInner.x, 1.0, length(qi));
    float above = 1.0 - smoothstep(uHz.y - 3.0 * uHz.z, uHz.y + uHz.z, p.y);
    return inSkull * outInner * above * uHz.w;
  }

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

  uniform vec4 uShock;     // where it started (x, y px), the wave's radius (px), its strength
  uniform float uShockW;   // the width of its band of light (px): her ignition's front is thin, a touch's is broad
  // the light of the wave's front where it crosses p
  float shockAt(vec2 p) { float d = length(p - uShock.xy) - uShock.z; float w = uShockW + 0.02 * uShock.z; return uShock.w * exp(-d * d / (w * w)); }

  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    if (uTime < vT) discard;
    // NO BLUNT CUTS (round 6): a line thins and fades into its ends, and the drawing front fades in
    float taper = smoothstep(0.0, uTaper, vEnd);
    float front = clamp((uTime - vT) / 0.09, 0.0, 1.0);
    float px = abs(vUv.y) * uHalfPx;
    float wire = exp(-pow(px / (uCorePx * (0.35 + 0.65 * taper)), 2.0));
    float soft = mix(uSoftLine, uSoftSketch, vSketch), glowAmt = mix(uGlowLine, uGlowSketch, vSketch);
    float halo = exp(-pow(px / max(0.5, soft), 2.0)) * 0.30 * glowAmt * taper;
    float age = uTime - vT;
    float heat = exp(-age * 4.0) * (1.0 - vSketch);                      // hot the instant her ignition's wave reaches it
    float press = 0.45 + 0.55 * noise(vec2(vS * 0.02 + vId * 37.0, vId * 11.0));   // pencil pressure
    float tip = vSketch * exp(-age * 5.0) * 0.7;                          // where the pencil just passed
    // HOT, then its own colour (vF): the flare carries the line's own colour - never a white sketch (Ruben: "the build
    // of white lines look bad")
    float coloured = smoothstep(vF, vF + 0.4, uTime);
    vec3 own = mix(mix(vCol, vec3(1.0), 0.45), vCol, coloured);
    vec3 c = mix(own * uGain, mix(vCol, vec3(1.0, 0.96, 1.0), 0.55) * uHot, heat);
    // the ignition's wave lights the line as it crosses it
    float sh = shockAt(vPos);
    c += vec3(0.95, 0.8, 1.0) * sh * 1.6;
    c *= mix(1.0, mix(uSketchBright * press, 1.0, uSettle), vSketch);
    c += vec3(1.0, 0.95, 1.0) * tip * uSketchBright;
    // at rest: light travelling along the line, each line on its own speed and phase
    float head = mod(uLiveT * (120.0 + vId * 160.0) * uPulseSpeed + vId * 3000.0, vLen + 900.0);   // (her pace clock)
    float d = head - vS;
    float pulse = (d > 0.0 && d < 150.0) ? 1.0 - d / 150.0 : 0.0;
    pulse *= pulse * uIdle * uPulse;
    c += vec3(1.0, 0.94, 1.0) * pulse * 2.0;
    // (under her hair her line gives way - lib/miraHairPic HAIR_ZONE_GLSL)
    // (the line settles to its resting brightness once its colour has come)
    float rest = 1.0 - (1.0 - uRest) * smoothstep(vF, vF + 0.6, uTime);
    // the lines in the front of her face catch the glow while she speaks
    c += faceColor(vPos) * faceGlow(vPos) * 1.2;
    gl_FragColor = vec4(c * (wire + halo) * uFade * front * (0.3 + 0.7 * taper) * (1.0 - underHair(vPos)), clamp((rest + heat + pulse * 0.8 + sh) * taper, 0.0, 1.0));
  }
