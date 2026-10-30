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


  uniform sampler2D uMap; uniform vec2 uSize; uniform float uGain;
  varying vec2 vRest; varying float vPatch; varying vec3 vTint; varying float vKind; varying float vShow;

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

  void main() {
    if (vShow < 0.5) discard;
    vec2 pc = gl_PointCoord - vec2(0.5);
    if (dot(pc, pc) > 0.25) discard;
    vec3 c;
    if (vKind > 4.5) {
      c = vec3(0.30, 0.16, 0.55) * 0.3;                         // the dim matter inside her head (seen only at a turn)
    } else {
      vec2 tile = vRest + pc * vPatch;                          // THE TILE: her picture at this fragment's own rest place
      vec4 t = texture2D(uMap, vec2(tile.x / uSize.x, 1.0 - tile.y / uSize.y));
      if (t.a < 0.5) discard;
      float bright = smoothstep(0.18, 0.55, max(t.r, max(t.g, t.b)));
      // (weighted by its see-through value, exactly as the flat picture was: her half-clear edge pixels never shine at
      // full strength)
      c = t.rgb * t.a * uGain * (1.0 - underHair(tile) * bright) * (1.0 + faceLift(tile)) * vTint;
      if (vKind < 0.5) c += faceColor(tile) * faceGlow(tile) * 0.8;   // the light in the front of her face
    }
    gl_FragColor = vec4(c, 1.0);
  }
