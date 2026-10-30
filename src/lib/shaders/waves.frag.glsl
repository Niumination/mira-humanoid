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
  uniform float uTime, uOpacity, uEnergy, uSeed;
  uniform vec2 uOrbPx;      // the ring's centre in this canvas's pixels (lib/orbScreen, y up)
  uniform float uOrbR;      // its radius in the same pixels
  varying vec2 vUv;
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm3(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return v; }
  void main() {
    // a MIRA ribbon (the near-orb correction, sections 12-13): ONE bright folding edge, a fading
    // translucent body, broken secondary detail - never two clean edges with a uniform fill
    float bright = 1.0 - smoothstep(0.0, 0.16, vUv.y);                       // lit from one side
    float body = (1.0 - smoothstep(0.10, 0.95, vUv.y)) * 0.55 + 0.10;         // fades away from the lit edge
    float endFade = smoothstep(0.0, 0.14, vUv.x) * (1.0 - smoothstep(0.86, 1.0, vUv.x));
    vec2 q = vec2(vUv.x * 9.0 + uSeed, vUv.y * 2.5);
    // a fine fold that comes and goes along the body, on its own clock
    float f = fbm3(q + vec2(uTime * 0.05, -uTime * 0.03));
    float fold = pow(1.0 - abs(f * 2.0 - 1.0), 8.0);
    // holes in the body itself, so no stretch reads as a plastic strip
    float holes = smoothstep(0.25, 0.65, fbm3(q * 0.7 + 3.1 + vec2(-uTime * 0.02, uTime * 0.035)));
    // internal lighting from a slow field that does NOT track the geometry: dim -> violet -> a small
    // bright region -> dim -> a second highlight; the rare top of it goes near-white
    float light = fbm3(vec2(vUv.x * 3.5, vUv.y * 0.8) + uSeed * 1.7 + vec2(uTime * 0.045, uTime * 0.02));
    float lit = smoothstep(0.40, 0.72, light);
    float hot = pow(smoothstep(0.66, 0.84, light), 1.5) * max(bright, fold);
    vec3 dark = vec3(0.24, 0.08, 0.52), violet = vec3(0.48, 0.20, 1.00), brightV = vec3(0.72, 0.38, 1.00);
    vec3 lav = vec3(0.88, 0.72, 1.00), white = vec3(1.00, 0.92, 1.00);
    vec3 col = mix(dark, violet, lit);
    col = mix(col, brightV, bright * (0.4 + 0.6 * lit));
    col = mix(col, lav, clamp(fold * 0.8 + bright * lit * 0.5, 0.0, 1.0));
    col = mix(col, white, clamp(hot * 1.4, 0.0, 1.0));
    float a = (0.05 * body * holes + 0.30 * bright * (0.5 + 0.5 * lit) + 0.45 * fold * holes) * endFade * uOpacity * (1.0 + uEnergy * 0.12);
    a += hot * 0.22 * endFade * uOpacity;     // the white only where the energy sits - scarce, and fainter than the core matter's
    // behind the orb: nothing of a ribbon shows inside the gold ring, a soft fade just outside it
    float behind = smoothstep(uOrbR * 0.92, uOrbR * 1.28, distance(gl_FragCoord.xy, uOrbPx));
    a *= behind;
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }
