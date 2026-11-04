precision highp float;
uniform sampler2D uTex; uniform float uOpacity; uniform float uDecode; varying vec2 vUv;
// uDecode=1: nilai medan nebula ditulis dalam RUANG TAMPILAN; saat dimasukkan ke render target
// linear (F-107) nilai itu harus di-decode sRGB→linear supaya komposit meng-encode-nya kembali sekali saja.
vec3 srgbToLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c)); }
void main() { vec3 c = texture2D(uTex, vUv).rgb * uOpacity; if (uDecode > 0.5) c = srgbToLin(c); gl_FragColor = vec4(c, 1.0); }   // opacity = min(1, waves*1.6) seperti live
