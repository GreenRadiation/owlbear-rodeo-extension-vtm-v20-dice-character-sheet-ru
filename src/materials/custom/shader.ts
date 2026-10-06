import * as THREE from "three";

import { DiceLook, DRAWN_PATTERNS, isTexturePattern } from "../../dice/look";

/**
 * The part of the look of custom dice that lives in the shader: the colors
 * and the pattern of the body.
 *
 * Painting them into textures would need textures of their own for every die
 * of a roll that has its own take on the pattern. Computed on the GPU they
 * cost nothing, so every die can have one and changing a color is instant.
 *
 * The patterns use their own hash so that every player sees the same thing.
 */

/** The size in pixels of the textures of the digits, the pattern is drawn in the same space */
export const PATTERN_SPACE = { width: 512, height: 1104 };
/** Where the faces of a D10 start and end across that space: from one pole of the die to the other */
export const POLE_RANGE = { start: 34, end: 491 };

export interface PatternUniforms {
  bodyColor: { value: THREE.Color };
  bodyColor2: { value: THREE.Color };
  digitsColor2: { value: THREE.Color };
  useDigitsColor2: { value: number };
  patternType: { value: number };
  patternStrength: { value: number };
  patternSize: { value: number };
  /** Added to the threshold of the pattern: above zero less of the second color, below zero more */
  patternBias: { value: number };
  /** Moves the pattern around for a die of its own, zero for the pattern as it is */
  patternSeed: { value: THREE.Vector2 };
  patternMap: { value: THREE.Texture | null };
  usePatternMap: { value: number };
  poleRange: { value: THREE.Vector2 };
}

export function createPatternUniforms(): PatternUniforms {
  return {
    bodyColor: { value: new THREE.Color() },
    bodyColor2: { value: new THREE.Color() },
    digitsColor2: { value: new THREE.Color() },
    useDigitsColor2: { value: 0 },
    patternType: { value: 0 },
    patternStrength: { value: 0 },
    patternSize: { value: 1 },
    patternBias: { value: 0 },
    patternSeed: { value: new THREE.Vector2() },
    patternMap: { value: null },
    usePatternMap: { value: 0 },
    poleRange: { value: new THREE.Vector2(POLE_RANGE.start, POLE_RANGE.end) },
  };
}

/** How many times bigger or smaller than usual the details of a pattern are for the scale of a look */
export function getDetailSize(patternScale: number) {
  return Math.pow(3, (patternScale - 0.5) * 2);
}

/** Where the pattern of a die with an id of its own starts, zero for the plain pattern */
export function getPatternSeed(dieId: string, unique: boolean) {
  if (!unique) {
    return [0, 0];
  }
  let h = 2166136261;
  for (let i = 0; i < dieId.length; i++) {
    h = Math.imul(h ^ dieId.charCodeAt(i), 16777619);
  }
  const x = ((h >>> 0) % 1000) / 1000;
  const y = (((h >>> 10) >>> 0) % 1000) / 1000;
  return [x * 2000 - 1000, y * 2000 - 1000];
}

/** Fill the uniforms in from a look */
export function applyPatternUniforms(
  uniforms: PatternUniforms,
  look: DiceLook,
  patternMap: THREE.Texture | null,
  seed: number[]
) {
  uniforms.bodyColor.value.set(look.body);
  uniforms.bodyColor2.value.set(look.body2);
  uniforms.digitsColor2.value.set(look.digits2 || look.digits);
  uniforms.useDigitsColor2.value = look.digits2 ? 1 : 0;
  const textured = isTexturePattern(look.pattern);
  uniforms.patternType.value = textured
    ? -1
    : (DRAWN_PATTERNS as readonly string[]).indexOf(look.pattern);
  uniforms.patternStrength.value = look.patternStrength;
  uniforms.patternSize.value = getDetailSize(look.patternScale);
  uniforms.patternBias.value = 0.5 - look.patternBalance;
  uniforms.patternSeed.value.set(seed[0], seed[1]);
  uniforms.patternMap.value = textured ? patternMap : null;
  uniforms.usePatternMap.value = textured && patternMap ? 1 : 0;
}

const PATTERN_GLSL = /* glsl */ `
uniform vec3 bodyColor;
uniform vec3 bodyColor2;
uniform vec3 digitsColor2;
uniform float useDigitsColor2;
uniform int patternType;
uniform float patternStrength;
uniform float patternSize;
uniform float patternBias;
uniform vec2 patternSeed;
uniform sampler2D patternMap;
uniform float usePatternMap;
uniform vec2 poleRange;

float v20Hash(vec2 p) {
  p = fract(p * vec2(0.1031, 0.1030));
  p += dot(p, p.yx + 33.33);
  return fract((p.x + p.y) * p.x);
}

float v20Noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(v20Hash(i), v20Hash(i + vec2(1.0, 0.0)), f.x),
    mix(v20Hash(i + vec2(0.0, 1.0)), v20Hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float v20Clouds(vec2 p) {
  float total = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 4; octave++) {
    total += v20Noise(p) * amplitude;
    p *= 2.0;
    amplitude *= 0.5;
  }
  return total / 0.9375;
}

float v20Speckles(vec2 p) {
  const float cell = 28.0;
  vec2 cellOf = floor(p / cell);
  float best = 0.0;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      vec2 c = cellOf + vec2(float(dx), float(dy));
      vec2 center = (c + vec2(v20Hash(c), v20Hash(c + vec2(91.0, -17.0)))) * cell;
      float radius = 3.0 + v20Hash(c + vec2(5.0, 11.0)) * 7.0;
      float distance = length(p - center);
      best = max(best, 1.0 - smoothstep(radius - 1.0, radius + 1.0, distance));
    }
  }
  return best;
}

// How much of the second color a pixel of the body gets
float v20Pattern(vec2 px) {
  float pole = (px.x - poleRange.x) / (poleRange.y - poleRange.x);
  float result = 0.0;
  if (usePatternMap > 0.5) {
    // The balance moves the brightness the second color starts at
    vec2 uv = (px + patternSeed) / vec2(${PATTERN_SPACE.width.toFixed(
      1
    )}, ${PATTERN_SPACE.height.toFixed(1)});
    result = smoothstep(2.0 * patternBias, 1.0 + 2.0 * patternBias, texture2D(patternMap, uv).r);
  } else {
    // A die of its own moves the pattern and may turn it around
    vec2 p = (px + patternSeed) / patternSize;
    float shift = fract(patternSeed.x / 997.0);
    float flip = step(0.5, fract(patternSeed.y / 991.0));
    float turned = mix(pole, 1.0 - pole, flip);
    if (patternType == 1) {
      result = smoothstep(2.0 * patternBias, 1.0 + 2.0 * patternBias, turned);
    } else if (patternType == 2) {
      result = smoothstep(0.495 + patternBias, 0.505 + patternBias, turned);
    } else if (patternType == 3) {
      float rings = 0.5 + 0.5 * sin((pole + shift) * 3.14159 * 9.0 / patternSize);
      result = smoothstep(0.35 + 1.5 * patternBias, 0.65 + 1.5 * patternBias, rings);
    } else if (patternType == 4) {
      float turbulence = v20Clouds(p / 120.0);
      float veins = 0.5 + 0.5 * sin(((pole + shift) * 2.0 / patternSize + turbulence * 5.0) * 3.14159);
      result = smoothstep(0.25 + 1.5 * patternBias, 0.75 + 1.5 * patternBias, veins);
    } else if (patternType == 5) {
      // Smaller speckles up to none, or bigger ones up to twice the size
      result = v20Speckles(p / max(0.001, 1.0 - 2.0 * patternBias));
    }
  }
  return result;
}
`;

/** Replaces the sampling of the map: the body is computed, what is painted goes over it */
const MAP_GLSL = /* glsl */ `
#ifdef USE_MAP
  vec4 painted = texture2D(map, vMapUv);
  vec2 px = vMapUv * vec2(${PATTERN_SPACE.width.toFixed(
    1
  )}, ${PATTERN_SPACE.height.toFixed(1)});
  float patternMix = v20Pattern(px) * patternStrength;
  vec3 body = mix(bodyColor, bodyColor2, patternMix);
  // A digit with the second color of the digits takes the pattern of the body
  float patterned = texture2D(roughnessMap, vMapUv).a * useDigitsColor2;
  vec3 paint = mix(painted.rgb, digitsColor2, patternMix * patterned);
  diffuseColor.rgb *= mix(body, paint, painted.a);
#endif
`;

/** Hook the pattern into a material */
export function installPatternShader(
  material: THREE.MeshPhysicalMaterial,
  uniforms: PatternUniforms
) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${PATTERN_GLSL}`)
      .replace("#include <map_fragment>", MAP_GLSL);
  };
  // Tells three.js apart from the other physical materials when it caches programs
  material.customProgramCacheKey = () => "v20-custom-dice";
}
