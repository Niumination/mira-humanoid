precision highp float;
uniform sampler2D uTex; uniform float uOpacity; varying vec2 vUv;
void main() { gl_FragColor = vec4(texture2D(uTex, vUv).rgb * uOpacity, 1.0); }   // opacity = min(1, waves*1.6) seperti live
