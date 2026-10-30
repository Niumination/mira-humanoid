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

  attribute vec3 aCol; attribute float aTw;
  uniform float uTime, uPx;
  varying vec3 vCol; varying float vA; varying vec2 vP;
  void main() {
    vP = position.xy;
    vec2 tp = position.xy + mass(position.xy);
    tp += hairTurn(tp);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(tp, 0.0, 1.0);
    float tw = 0.5 + 0.5 * sin(uTime * (0.6 + 1.8 * aTw) + aTw * 40.0);
    vA = tw * tw * tw;
    vCol = aCol;
    gl_PointSize = uPx * (1.5 + 2.5 * tw);
  }
