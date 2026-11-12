#version 300 es
precision highp float;
// plumbing sama dengan picFill.frag (three.js GLSL3 → GLSL1)
#define varying in
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
#define texture2D texture
// F-148: penutup badan (occluder). Di live badan & kepala adalah MESH 3D gelap yang MENUTUPI latar;
// di build kita badan digambar dari kuad citra yang 78 % pikselnya beralfa < 0,1, sehingga nebula
// menembus celah di antara garis cahaya. Terukur (t=9,5, crop torso): pada piksel yang di live gelap
// (<20) kita +9,2 lebih terang, sedangkan piksel terang justru −1,9 ⇒ penutup yang hilang.
// `uMap` = SILUET (alfa citra diburamkan lalu di-ambang), bukan citra asli.
uniform sampler2D uMap;
uniform float uK;          // kekuatan penutup (0 = mati)
uniform vec2 uSize;        // ukuran gambar px (untuk reveal)
uniform float uTime;       // jam build
uniform vec4 uReveal;      // (x, y), ignite, kecepatan gelombang — sama dengan picFill
varying vec2 vUv;

float revealAt(vec2 p) {
  float r = length(p - uReveal.xy), s = uReveal.w;
  return uReveal.z + (r <= 1.64 * s ? (1.0 - sqrt(max(0.0, 1.0 - 0.36 * r / s))) / 0.18 : r / (0.82 * s));
}

void main() {
  vec2 p = vec2(vUv.x * uSize.x, (1.0 - vUv.y) * uSize.y);
  float at = revealAt(p);
  float m = clamp(texture2D(uMap, vUv).a * uK, 0.0, 1.0);
  gl_FragColor = vec4(vec3(0.0), m * smoothstep(at - 0.04, at + 0.4, uTime));
}
