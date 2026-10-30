
  precision highp float;
  uniform vec2  iRes;
  uniform float iTime;
  uniform float iField;     // 0..1 - atmosphere + filaments (the brief: 0.6 s atmosphere, 0.9 s filaments)
  uniform float iMatter;    // 0..1 - the near-orb matter, the membranes and the moving energy (1.2 s, 1.5 s)
  uniform vec2  iCenter;    // the ring's centre, in uv (y up) - measured from the ring drawing (lib/orbScreen)
  uniform float iRing;      // the gold ring's radius, in uv-height units - measured, never assumed
  uniform float iClear;     // 1 = the orb's core stays clear (the ring); 0 = around her humanoid (her body blocks it instead)
  uniform float iSpread;    // lib/miraDial field.spread: 0 = the field as designed (dark gaps, matter near the ring); 1 = violet fog across the whole screen
  uniform float iState;     // 0 standby · 1 listening · 2 thinking · 3 speaking (subtle, per the brief)
  uniform float iEnergy;    // MIRA's voice level 0..1 while she speaks (a slight boost, never a visualizer)
  uniform float iDebug;     // lib/miraDebug: 0 off · 1 orb only · 2 raw mask · 3 mask*breakup · 4 near RED · 5 hot WHITE · 6 near+hot
  uniform float iAlpha;     // lib/miraDial field.alpha: the whole field's strength (0.25 ships)
  uniform float iNear;      // lib/miraDial field.near: the faint haze near the ring (1 ships)
  uniform float iHotLo;     // the hotspot threshold (0.64; debugging may lower it to see the field at all)

  // ── the brief's toolbox: hash / noise / fbm / domain warp ──
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return v; }
  float fbm3(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return v; }
  // the two axes never move at the same speed (the brief) - the material stretches and flows
  vec2 domainWarp(vec2 p, float t) {
    vec2 q = vec2(fbm(p + vec2(0.0, t * 0.045)), fbm(p + vec2(5.2, -t * 0.037)));
    vec2 r = vec2(fbm(p + 3.8 * q + vec2(1.7, t * 0.027)), fbm(p + 3.2 * q + vec2(8.3, -t * 0.031)));
    return p + 1.4 * r;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / iRes;
    vec2 asp = vec2(iRes.x / iRes.y, 1.0);
    // three time bases for the wide field: nothing is mechanically synchronized (the brief, sections 22-23)
    float slowT = iTime * 0.035, medT = iTime * 0.08, fineT = iTime * 0.14;
    float listening = step(0.5, iState) * (1.0 - step(1.5, iState));
    float thinking  = step(1.5, iState) * (1.0 - step(2.5, iState));
    float speaking  = step(2.5, iState);
    float audioBoost = 1.0 + iEnergy * 0.20 * speaking;   // the field only breathes; the ring and ribbons carry her talking
    // the near-orb matter and the white energy keep their OWN clocks (the near-orb correction, section 20):
    // the breakup mask on the slow one, the folds on the medium one, the hotspots on the detail one
    float nearSlowT = iTime * 0.02, nearMedT = iTime * 0.05, hotT = iTime * 0.11 * (1.0 + 0.35 * thinking);
    float debugOn = step(0.5, iDebug);

    // the orb: a localized distortion zone, never a visible ring
    vec2 toOrb = (uv - iCenter) * asp;
    float distanceToOrb = length(toOrb);
    vec2 dir = toOrb / (distanceToOrb + 0.0001);
    vec2 tangent = vec2(-dir.y, dir.x);
    float orbInfluence = 1.0 - smoothstep(iRing * 0.9, iRing * 3.0, distanceToOrb);
    // (2026-09-18: the field no longer squeezes toward the orb while she listens - Ruben: nothing
    // rigid in listening mode; the look changes only through eased values)
    vec2 p = (uv - 0.5) * asp * 2.0;

    // ── the wide field: warped, then folded into thin illuminated ridges (never visible noise) ──
    vec2 warped = domainWarp(p, iTime);
    warped += tangent * orbInfluence * sin(distanceToOrb * 17.0 + medT * 4.6) * 0.035;   // bends around the orb, subtly
    float distortion = fbm(warped * 1.7 + slowT);
    float irregularDistance = distanceToOrb + distortion * 0.09;                       // no clean radial function anywhere

    float fieldL = fbm(warped * 0.45 + vec2(slowT * 0.6, -slowT * 0.4));   // large, huge, barely visible
    float fieldA = fbm(warped * 1.15 + vec2(medT * 0.3, 0.0));             // primary matter
    float fieldB = fbm(warped * 2.1 + 7.4 + vec2(0.0, fineT * 0.25));     // fine energized lines

    float ridgeA = pow(1.0 - abs(fieldA * 2.0 - 1.0), 6.0);
    float ridgeB = pow(1.0 - abs(fieldB * 2.0 - 1.0), 10.0);
    float ridgeL = pow(1.0 - abs(fieldL * 2.0 - 1.0), 5.0);
    float membrane = smoothstep(0.48, 0.72, fieldA) * 0.12;
    float membraneL = smoothstep(0.52, 0.80, fieldL) * 0.07;

    // ── moving local energy over the wide field: sections light up and fade on their own field ──
    float energyRaw = fbm(warped * 0.65 + vec2(slowT * 0.6 * (1.0 + 0.5 * thinking), -slowT * 0.5));
    float energy = smoothstep(0.58, 0.78, energyRaw);
    ridgeA *= mix(0.4, 1.7, energy) * audioBoost;
    ridgeB *= mix(0.6, 1.5, energy) * audioBoost;
    // a RARE near-white event far from the orb (section 14): a distant line gets one brief bright node
    float farHot = pow(smoothstep(0.80, 0.92, energyRaw), 1.5) * max(ridgeA, ridgeB);

    // the wide field is a little denser near the orb, by irregular distance, never a ring
    float near = (1.0 - smoothstep(iRing * 1.1, iRing * 3.2, irregularDistance)) * smoothstep(iRing * 0.85, iRing * 1.15, irregularDistance);
    ridgeB *= 1.0 + 0.6 * near;
    ridgeA *= 1.0 + 0.3 * near;
    // and the core itself stays clear
    // (around her humanoid there is no core to keep clear: the circle read as a hole in the lit room)
    float clear = mix(1.0, smoothstep(iRing * 0.80, iRing * 1.05, distanceToOrb), iClear);

    // ── NEAR-ORB MATTER: MIRA's primary signature (the near-orb correction, sections 3-8) ──
    // orb distance is an INVISIBLE probability mask (strongest 1.05-2.5 R), never rendered directly:
    // it is broken up by a slow domain-warped field first, so what shows is asymmetric fragments of
    // fine folds, broken filaments and local membranes wrapping and crossing around the orb - no halo.
    float innerMask = smoothstep(iRing * 0.90, iRing * 1.10, distanceToOrb);
    float outerMask = 1.0 - smoothstep(iRing * 2.0, iRing * 2.7, distanceToOrb);
    float rawMask = innerMask * outerMask;          // debug view 2 shows exactly this
    float nearOrbMask = rawMask;
    float breakupS = 0.0;
    float nearRidgeA = 0.0, nearRidgeB = 0.0, nearBody = 0.0, hotspot = 0.0, hotGlow = 0.0;
    if (nearOrbMask > 0.002) {
      // the creator's first numbers (scale 1.35, 0.34-0.70) left the inner band nearly empty in the
      // real stack (debug view 3): two patches at ~2 R and nothing hugging the ring. Smaller, more
      // numerous fragments and a wider window keep the orb EMBEDDED while still never a full circle.
      float breakup = fbm3(warped * 1.9 + vec2(nearSlowT * 1.05, -nearSlowT * 0.8));
      breakupS = smoothstep(0.22, 0.62, breakup);
      nearOrbMask *= breakupS;
      float nearFieldA = fbm(warped * 1.4 + vec2(nearMedT * 0.4, nearMedT * 0.25));
      float nearFieldB = fbm(warped * 2.7 + 8.7 + vec2(-nearMedT * 0.3, nearMedT * 0.5));
      nearRidgeA = pow(1.0 - abs(nearFieldA * 2.0 - 1.0), 7.0) * nearOrbMask;     // fine folds
      nearRidgeB = pow(1.0 - abs(nearFieldB * 2.0 - 1.0), 12.0) * nearOrbMask;    // broken filaments
      nearBody = smoothstep(0.50, 0.78, nearFieldA) * nearOrbMask;                 // fragmented local membranes
      // the INDEPENDENT energy field (section 7): its own slow clock, partially unrelated to the folds,
      // so a fold persists while the light appears in it, travels, weakens and moves elsewhere.
      // NOT multiplied away (the debug note, section 7): energy x the matter's PRESENCE, one product,
      // where presence is the strongest structure under this pixel - fold, filament or membrane body
      // at the creator's scale (0.62) one or two noise cells covered the whole band, so for long
      // stretches NOTHING was hot (debug view 5 stayed black even at 0.48); at 1.5 several cells
      // cross the band at once - a few are hot, they last seconds, they move on
      float energyField = fbm3(warped * 1.5 + vec2(hotT * 0.28, -hotT * 0.21));
      // measured in the lab (debug view 5): this field crosses 0.48 in 2-4 places at a time and
      // almost never 0.56, so the working threshold is ~0.50 (lib/miraDebug HOT_THRESHOLD_DEFAULT),
      // not the 0.64 the note started from. Presence is lifted so a hot pixel on real matter reaches
      // FULL white instead of a grey ceiling (a membrane body alone tops out at 0.6).
      float energyHot = smoothstep(iHotLo, iHotLo + 0.07, energyField);   // narrow, so a hot cell reaches 1 (this field peaks ~0.57)
      float matterPresence = min(1.0, max(max(nearRidgeA, nearRidgeB), nearBody * 0.6) * 1.6);
      hotspot = energyHot * matterPresence;
      // this canvas has no bloom, so the white-hot core carries its own soft lilac glow: the same
      // fold at a LOW power is a wide soft band around the thin ridge
      hotGlow = energyHot * pow(1.0 - abs(nearFieldA * 2.0 - 1.0), 2.0) * nearOrbMask;
    }

    // ── colour: mixed by intensity, never one flat purple; high energy moves the colour toward WHITE ──
    vec3 violetDeep   = vec3(0.18, 0.05, 0.38);
    vec3 violetMain   = vec3(0.48, 0.20, 1.00);
    vec3 violetBright = vec3(0.72, 0.38, 1.00);
    vec3 lavender     = vec3(0.88, 0.72, 1.00);
    vec3 baseViolet   = vec3(0.40, 0.12, 0.92);
    vec3 whiteViolet  = vec3(1.00, 0.95, 1.00);
    vec3 color = mix(violetDeep, violetMain, fieldA);
    color = mix(color, violetBright, clamp(ridgeA, 0.0, 1.0));
    color = mix(color, lavender, clamp(ridgeB * energy, 0.0, 1.0));

    // ── the wide field's alpha: dimmer than the near-orb matter, and never even everywhere ──
    // background 20% in the hierarchy: with the near-orb layer at full strength the wide field was
    // filling most of the frame (debug view ALL) - it is pulled back so large black areas remain
    // and pulled back again to ~25% for the core-matter round (section 22): faint atmosphere only
    float alpha = iAlpha * (membraneL * 0.5 * iField + membrane * 0.26 * iMatter + ridgeL * 0.07 * iField
                + ridgeA * 0.30 * iMatter + ridgeB * 0.42 * iField);
    float visibility = smoothstep(0.32, 0.70, fbm(warped * 0.6 + 12.0 + vec2(slowT * 0.3, -slowT * 0.2)));
    // FOG ACROSS THE WHOLE SCREEN (Ruben, her humanoid, 2026-10-08): the dark gaps close up as it rises
    visibility = mix(visibility, 0.55 + 0.45 * visibility, iSpread);
    alpha *= visibility * clear;
    float quiet = 1.0 - 0.18 * (1.0 - step(0.5, iState));    // standby: a little quieter
    alpha *= quiet;

    // near-orb matter (normal blending, low opacity): dark violet -> violet -> bright lavender along one structure
    vec3 nearCol = mix(baseViolet, violetBright, clamp(nearRidgeA * 1.4, 0.0, 1.0));
    nearCol = mix(nearCol, lavender, clamp(nearRidgeB, 0.0, 1.0));
    nearCol = mix(nearCol, whiteViolet, clamp(hotspot * 1.5, 0.0, 1.0));
    // the hero layer (the creator's hierarchy: near-orb 100 / orb 90 / hotspots 70 / ribbons 35 / background 20):
    // weights set from debug view D in the real stack, where the first cut read at about half of this
    float nearAlpha = (nearBody * 0.30 + nearRidgeA * 1.00 + nearRidgeB * 0.95) * iMatter * quiet * audioBoost * iNear;

    // ── ground: near-black navy with an atmospheric violet that is NOT centered on the orb ──
    vec3 ground = mix(vec3(0.012, 0.011, 0.030), vec3(0.005, 0.004, 0.013), smoothstep(0.35, 1.25, length((uv - 0.5) * asp)));
    float atmo = smoothstep(0.40, 0.9, fbm(p * 0.28 + vec2(slowT * 0.25, slowT * 0.15) + 30.0)) * 0.09 * iField;

    // ── DEBUG VIEWS (lib/miraDebug): each system alone, obvious, in the real stack ──
    if (debugOn > 0.5) {
      vec3 dbg = ground;
      if (iDebug < 1.5) { }                                                              // 1: the orb alone
      else if (iDebug < 2.5) dbg = vec3(rawMask);                                        // 2: the raw distance mask
      else if (iDebug < 3.5) dbg = vec3(rawMask * breakupS);                             // 3: the mask after breakup
      else if (iDebug < 4.5) dbg += vec3(1.0, 0.0, 0.0) * clamp((nearRidgeA + nearRidgeB) * 3.0 + nearBody * 1.5, 0.0, 1.0);   // 4: near-orb matter, RED
      else if (iDebug < 5.5) dbg += vec3(1.0) * clamp(hotspot * 2.5 + hotGlow * 0.35, 0.0, 1.0);                                // 5: hotspots, WHITE
      else if (iDebug < 6.5) {                                                           // 6: near-orb + hotspots, no wide field
        dbg = mix(dbg, nearCol, clamp(nearAlpha, 0.0, 1.0));
        dbg += lavender * hotGlow * 0.5 * iMatter + whiteViolet * hotspot * 1.6 * iMatter;
      }
      // 7 core / 8 corehot: the field steps aside entirely - MiraCoreMatter alone with the orb (section 31)
      gl_FragColor = vec4(dbg, 1.0);
      return;
    }

    vec3 col = ground + violetDeep * atmo;
    // the spread fog itself: a soft violet haze with the field's own large shapes in it, everywhere
    float haze = (0.35 + 0.65 * smoothstep(0.25, 0.85, fieldL)) * (0.6 + 0.4 * visibility);
    col += mix(violetDeep, violetMain, fieldL * 0.8) * haze * 0.30 * iSpread * iField * iAlpha;
    col = col + color * clamp(alpha, 0.0, 1.0);
    // the near-orb procedural block survives only as faint edge turbulence under the core ribbons
    // (the core-matter note, sections 1 and 33) - a violet trace, never white, never the hero
    vec3 nearFaint = mix(baseViolet, violetBright, clamp(nearRidgeA * 1.4, 0.0, 1.0));
    col = mix(col, nearFaint, clamp(nearAlpha * 0.18, 0.0, 1.0));
    // no additive white from this field any more: the white energy travels inside MiraCoreMatter's ribbons
    gl_FragColor = vec4(col, 1.0);
  }
