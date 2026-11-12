#version 300 es
precision highp float;
// plumbing sama dengan picFill.frag (three.js GLSL3 → GLSL1)
#define varying in
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
#define texture2D texture
// F-149: PENUTUP BADAN BERPERMUKAAN. Di live badan/kepala adalah mesh 3D gelap: nebula tidak
// menembusnya, dan terang badannya datang dari pencahayaan permukaan (diffuse + rim), bukan dari
// kecerahan rata kuad citra. Di build kita badan hanya kuad dengan alfa per-piksel, sehingga
// (a) nebula menembus celah antar garis, (b) bagian badan yang terang di citra ikut terang penuh.
// Di sini normal permukaan diturunkan dari MEDAN TINGGI siluet (alfa yang diburamkan):
//   h  = siluet halus (0..1) — tebal badan
//   N  = normalize(-dh/dx·k, -dh/dy·k, 1) — permukaan yang melengkung di tepi
// lalu diwarnai: dasar gelap + diffuse satu lampu kunci + rim Fresnel di tepi (persis kelakuan
// mesh live: tepi terang, tengah gelap). Fase kemunculan memakai `revealAt` yang sama.
// Semua knob bawaan 0 ⇒ pass dilewati sepenuhnya ⇒ gambar identik produksi.
uniform sampler2D uSil;    // siluet (alfa ter-ambang) — menentukan CAKUPAN opak
uniform sampler2D uH;      // medan tinggi (alfa buram, float) — menentukan NORMAL
uniform vec2 uSize;        // ukuran gambar px (untuk reveal)
uniform vec2 uTexel;       // 1/ukuran uH
uniform float uTime;       // jam build
uniform vec4 uReveal;      // (x, y), ignite, kecepatan gelombang — sama dengan picFill
uniform float uK;          // kekuatan penutup (0 = mati)
uniform float uBase;       // cahaya dasar badan
uniform float uDiff;       // kekuatan diffuse (lampu kunci)
uniform float uRim;        // kekuatan rim Fresnel
uniform float uHgt;        // skala tinggi → ketajaman normal (0 = datar)
uniform float uGate;       // ambang siluet (bagian yang dianggap badan) — cakupan/erosi
uniform float uBright;     // 0 = badan menutup seluruh siluet · 1 = hanya bagian GELAP citra
                           // (piksel yang di live memang terang tidak boleh ikut diredupkan)
uniform vec3 uBaseCol;
uniform vec3 uRimCol;
varying vec2 vUv;

float revealAt(vec2 p) {
  float r = length(p - uReveal.xy), s = uReveal.w;
  return uReveal.z + (r <= 1.64 * s ? (1.0 - sqrt(max(0.0, 1.0 - 0.36 * r / s))) / 0.18 : r / (0.82 * s));
}

void main() {
  float h = texture2D(uH, vUv).a;
  float hx = texture2D(uH, vUv + vec2(uTexel.x, 0.0)).a - texture2D(uH, vUv - vec2(uTexel.x, 0.0)).a;
  float hy = texture2D(uH, vUv + vec2(0.0, uTexel.y)).a - texture2D(uH, vUv - vec2(0.0, uTexel.y)).a;
  vec3 N = normalize(vec3(-hx * uHgt, -hy * uHgt, 1.0));
  vec3 L = normalize(vec3(-0.38, 0.46, 0.80));      // lampu kunci: kiri-atas-depan
  float diff = max(dot(N, L), 0.0);
  float fres = pow(1.0 - clamp(N.z, 0.0, 1.0), 2.0);
  float cov = smoothstep(uGate, uGate + 0.35, h);          // erosi: hindari halo di tepi siluet
  float lum = dot(texture2D(uSil, vUv).rgb, vec3(0.2126, 0.7152, 0.0722));
  float darkW = 1.0 - smoothstep(0.06, 0.30, lum);          // 1 di bagian gelap citra
  float body = cov * mix(1.0, darkW, uBright);
  vec3 col = uBaseCol * (uBase + uDiff * diff) + uRimCol * (uRim * fres * body);
  vec2 p = vec2(vUv.x * uSize.x, (1.0 - vUv.y) * uSize.y);
  float at = revealAt(p);
  float a = clamp(texture2D(uSil, vUv).a * body * uK, 0.0, 1.0) * smoothstep(at - 0.04, at + 0.4, uTime);
  gl_FragColor = vec4(col, a);
}
