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


  uniform sampler2D uMap; uniform vec2 uSize; uniform float uGain, uOn;
  varying vec2 vPos;

  uniform vec4 uReveal;    // her heart (x, y px), her ignition (s), the wave's speed (px/s)
  // when her ignition's wave reaches p: her picture, her lines and her hair appear there
  float revealAt(vec2 p) {
    float r = length(p - uReveal.xy), s = uReveal.w;
    return uReveal.z + (r <= 1.64 * s ? (1.0 - sqrt(max(0.0, 1.0 - 0.36 * r / s))) / 0.18 : r / (0.82 * s));
  }

  uniform float uBT, uUp, uSide;
  float hairT(vec2 q) { return revealAt(q - vec2(uSide, uUp)); }
  vec3 built(vec3 c, vec2 q) {
    float t = hairT(q), age = uBT - t;
    float on = smoothstep(-0.05, 0.3, age);
    float edge = age > -0.05 ? exp(-max(0.0, age) * 5.0) : 0.0;          // the bright leading edge behind the wave
    return c * on + (c * 1.4 + vec3(0.32, 0.22, 0.5) * max(c.r, max(c.g, c.b))) * edge * on;
  }
  float colouredAt(vec2 q) { return smoothstep(-0.05, 0.3, uBT - hairT(q)); }

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

  uniform float uClock, uMass, uEarY, uTop; uniform vec2 uHead; uniform vec2 uHairOff;
  vec2 mass(vec2 p) {
    float g = smoothstep(uEarY, uEarY + 260.0, p.y) * uMass * 8.0;
    vec2 hang = g * vec2(sin(uClock * 0.5 + p.y * 0.008 + p.x * 0.004) * 0.6 + sin(uClock * 0.27 + p.y * 0.013 - p.x * 0.006) * 0.4,
                         0.15 * sin(uClock * 0.33 + p.x * 0.01));
    vec2 out_ = p - uHead; float r = length(out_); out_ = r > 1.0 ? out_ / r : vec2(0.0, -1.0);
    float a = atan(out_.x, -out_.y);                                     // round her head from the top
    float t = (1.0 - smoothstep(uEarY - 30.0, uEarY + 50.0, p.y)) * smoothstep(3.0, 45.0, abs(p.x - uHead.x)) * uTop * 3.2;
    vec2 top = t * (out_ * (0.6 + 0.4 * sin(uClock * 0.6 + a * 3.0)) * sin(uClock * 0.42 + a * 2.0 + r * 0.01)
                  + vec2(-out_.y, out_.x) * 0.5 * sin(uClock * 0.37 + a * 5.0 - r * 0.02));
    return hang + top;
  }
  // HER HEAD TURNS (lib/figureHead3d): the hair rides a SOFT shell of her head (hair px <-> her picture's px), so it
  // turns with her head and never stretches sharply at its edge; hairSource = where a point of the screen came FROM
  vec2 hairTurn(vec2 q) { return headPlaceSoft(q - uHairOff, 6.0).xy + uHairOff - q; }
  vec2 hairSource(vec2 q) { vec2 s = q - hairTurn(q); s = q - hairTurn(s); return q - hairTurn(s); }

  void main() {
    vec2 q = hairSource(vPos);
    vec3 c = texture2D(uMap, (q - mass(q)) / uSize).rgb;
    gl_FragColor = vec4(built(c, q) * uGain * uOn, 1.0);
  }
