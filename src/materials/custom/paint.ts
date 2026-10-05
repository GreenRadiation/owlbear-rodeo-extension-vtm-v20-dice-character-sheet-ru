/**
 * Paints the textures of custom dice pixel by pixel.
 * Pure functions on arrays: no DOM, no three.js.
 *
 * Everything is deterministic: the same look gives the same pixels for every
 * player, the patterns use their own hash and not Math.random.
 */

import { DiceLook, Pattern, parseColor } from "../../dice/look";

/** A rectangle of a texture in pixels */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** What the painter has to know about the texture it paints */
export interface PaintLayout {
  width: number;
  height: number;
  /** Where the faces of the die start and end across the texture: from one pole of the die to the other */
  poleStart: number;
  poleEnd: number;
  /** Where the ten and the one are */
  ten: Rect;
  one: Rect;
}

/** Roughness of the paint the digits are filled with, as in the textures of the original dice */
const DIGIT_ROUGHNESS = 210;
/** How strong the engraving of the digits is */
const ENGRAVING = 0.25;

function hash(x: number, y: number) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

function smoothstep(from: number, to: number, value: number) {
  return smooth(Math.min(1, Math.max(0, (value - from) / (to - from))));
}

/** Smooth noise from 0 to 1 */
function noise(x: number, y: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smooth(x - x0);
  const ty = smooth(y - y0);
  const top = hash(x0, y0) * (1 - tx) + hash(x0 + 1, y0) * tx;
  const bottom = hash(x0, y0 + 1) * (1 - tx) + hash(x0 + 1, y0 + 1) * tx;
  return top * (1 - ty) + bottom * ty;
}

/** A few layers of noise on top of each other, from 0 to 1 */
function clouds(x: number, y: number) {
  let total = 0;
  let amplitude = 0.5;
  for (let octave = 0; octave < 4; octave++) {
    total += noise(x, y) * amplitude;
    x *= 2;
    y *= 2;
    amplitude /= 2;
  }
  return total / 0.9375;
}

/** Size of the cells the speckles are scattered in, in pixels */
const SPECKLE_CELL = 28;

function speckles(x: number, y: number) {
  const cellX = Math.floor(x / SPECKLE_CELL);
  const cellY = Math.floor(y / SPECKLE_CELL);
  let best = 0;
  // A speckle can reach into the cells next to its own
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = cellX + dx;
      const cy = cellY + dy;
      const centerX = (cx + hash(cx, cy)) * SPECKLE_CELL;
      const centerY = (cy + hash(cy + 91, cx - 17)) * SPECKLE_CELL;
      const radius = 3 + hash(cx + 5, cy + 11) * 7;
      const distance = Math.hypot(x - centerX, y - centerY);
      best = Math.max(best, 1 - smoothstep(radius - 1, radius + 1, distance));
    }
  }
  return best;
}

/**
 * How much of the second color of the body a pixel gets, 0 to 1.
 * `pole` is where the pixel is between the poles of the die, 0 to 1.
 */
export function getPatternMix(
  pattern: Pattern,
  x: number,
  y: number,
  pole: number
): number {
  switch (pattern) {
    case "solid":
      return 0;
    case "gradient":
      return smooth(Math.min(1, Math.max(0, pole)));
    case "halves":
      return smoothstep(0.495, 0.505, pole);
    case "rings":
      return smoothstep(0.35, 0.65, 0.5 + 0.5 * Math.sin(pole * Math.PI * 9));
    case "marble": {
      const turbulence = clouds(x / 120, y / 120);
      const veins = 0.5 + 0.5 * Math.sin((pole * 2 + turbulence * 5) * Math.PI);
      return smoothstep(0.25, 0.75, veins);
    }
    case "speckles":
      return speckles(x, y);
  }
}

function inside(rect: Rect, x: number, y: number) {
  return (
    x >= rect.x &&
    x < rect.x + rect.width &&
    y >= rect.y &&
    y < rect.y + rect.height
  );
}

export interface PaintedTextures {
  /** Color, sRGB */
  albedo: Uint8ClampedArray;
  /** The glow of the digits, sRGB */
  emissive: Uint8ClampedArray;
  /**
   * Red: what light passes through for dice of glass, the digits are solid.
   * Green: roughness. Blue: metalness.
   */
  surface: Uint8ClampedArray;
}

/**
 * Paint the textures of a look.
 * `digits` is how much of every pixel is a digit, 0 to 255.
 */
export function paintLook(
  look: DiceLook,
  digits: Uint8Array,
  layout: PaintLayout
): PaintedTextures {
  const { width, height } = layout;
  const albedo = new Uint8ClampedArray(width * height * 4);
  const emissive = new Uint8ClampedArray(width * height * 4);
  const surface = new Uint8ClampedArray(width * height * 4);

  const body = parseColor(look.body);
  const body2 = parseColor(look.body2);
  const digitColor = parseColor(look.digits);
  const tenColor = look.tenColor ? parseColor(look.tenColor) : digitColor;
  const oneColor = look.oneColor ? parseColor(look.oneColor) : digitColor;
  const roughness = look.roughness * 255;
  const metalness = look.metalness * 255;
  const glows = look.glow > 0;
  const poleLength = layout.poleEnd - layout.poleStart;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      const i = pixel * 4;
      const digit = digits[pixel] / 255;
      const mix =
        getPatternMix(look.pattern, x, y, (x - layout.poleStart) / poleLength) *
        look.patternStrength;
      const color =
        digit === 0
          ? digitColor
          : inside(layout.ten, x, y)
          ? tenColor
          : inside(layout.one, x, y)
          ? oneColor
          : digitColor;
      for (let channel = 0; channel < 3; channel++) {
        const bodyChannel =
          body[channel] + (body2[channel] - body[channel]) * mix;
        albedo[i + channel] =
          bodyChannel + (color[channel] - bodyChannel) * digit;
        emissive[i + channel] = glows ? color[channel] * digit : 0;
      }
      albedo[i + 3] = 255;
      emissive[i + 3] = 255;
      surface[i] = 255 * (1 - digit);
      surface[i + 1] = roughness + (DIGIT_ROUGHNESS - roughness) * digit;
      surface[i + 2] = metalness * (1 - digit);
      surface[i + 3] = 255;
    }
  }

  return { albedo, emissive, surface };
}

/** Blur with a box of the given radius, one pass in each direction */
function blur(
  source: Uint8Array,
  width: number,
  height: number,
  radius: number
) {
  const size = radius * 2 + 1;
  const horizontal = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let d = -radius; d <= radius; d++) {
        sum += source[y * width + Math.min(width - 1, Math.max(0, x + d))];
      }
      horizontal[y * width + x] = sum / size;
    }
  }
  const result = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let d = -radius; d <= radius; d++) {
        sum += horizontal[Math.min(height - 1, Math.max(0, y + d)) * width + x];
      }
      result[y * width + x] = sum / size;
    }
  }
  return result;
}

/**
 * The normal map that engraves the digits into the die.
 * Has the same shape as the normal maps of the original dice: a digit to the
 * right of a pixel makes its red go up, a digit below makes its green go down.
 */
export function paintNormals(
  digits: Uint8Array,
  width: number,
  height: number
): Uint8ClampedArray {
  const depth = blur(digits, width, height, 2);
  const normals = new Uint8ClampedArray(width * height * 4);
  const at = (x: number, y: number) =>
    depth[
      Math.min(height - 1, Math.max(0, y)) * width +
        Math.min(width - 1, Math.max(0, x))
    ];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const dx = (at(x + 1, y) - at(x - 1, y)) * ENGRAVING;
      const dy = (at(x, y - 1) - at(x, y + 1)) * ENGRAVING;
      normals[i] = 128 + dx;
      normals[i + 1] = 128 + dy;
      normals[i + 2] =
        128 + Math.sqrt(Math.max(0, 127 * 127 - dx * dx - dy * dy));
      normals[i + 3] = 255;
    }
  }
  return normals;
}
