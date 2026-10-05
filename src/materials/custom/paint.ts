/**
 * Paints the textures of custom dice pixel by pixel.
 * Pure functions on arrays: no DOM, no three.js.
 *
 * Everything is deterministic: the same look gives the same pixels for every
 * player, the patterns use their own hash and not Math.random.
 */

import {
  DiceLook,
  DrawnPattern,
  isTexturePattern,
  parseColor,
} from "../../dice/look";

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

/** What is drawn on the faces of a die, for every pixel from 0 to 255 */
export interface Shapes {
  /** How much of the pixel is a digit or an icon */
  digits: Uint8Array;
  /** How much of the pixel is the line around a digit */
  outline: Uint8Array;
}

/** How strong the engraving of the digits is in the normal map */
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
 * How many times bigger or smaller than usual the details of a pattern are
 * for the scale of a look: a third at 0, the usual size at 0.5, three times at 1.
 */
export function getDetailSize(patternScale: number) {
  return Math.pow(3, (patternScale - 0.5) * 2);
}

/**
 * How much of the second color of the body a pixel gets, 0 to 1.
 * `pole` is where the pixel is between the poles of the die, 0 to 1.
 * `size` is how big the details are compared to their usual size.
 */
export function getPatternMix(
  pattern: DrawnPattern,
  x: number,
  y: number,
  pole: number,
  size = 1
): number {
  switch (pattern) {
    case "solid":
      return 0;
    case "gradient":
      return smooth(Math.min(1, Math.max(0, pole)));
    case "halves":
      return smoothstep(0.495, 0.505, pole);
    case "rings":
      return smoothstep(
        0.35,
        0.65,
        0.5 + 0.5 * Math.sin((pole * Math.PI * 9) / size)
      );
    case "marble": {
      const turbulence = clouds(x / 120 / size, y / 120 / size);
      const veins =
        0.5 + 0.5 * Math.sin(((pole * 2) / size + turbulence * 5) * Math.PI);
      return smoothstep(0.25, 0.75, veins);
    }
    case "speckles":
      return speckles(x / size, y / size);
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
   * Red: 255 on the body and 0 on what is painted on it. Tells where light
   * passes through dice of glass and where the lacquer of the body is.
   * Green: roughness. Blue: metalness.
   */
  surface: Uint8ClampedArray;
}

/**
 * The part of a look that changes what is painted.
 * The rest of a look only sets up the material and needs no new textures.
 */
export function getPaintKey(look: DiceLook) {
  return JSON.stringify([
    look.body,
    look.body2,
    look.pattern,
    look.patternStrength,
    isTexturePattern(look.pattern) ? 0 : look.patternScale,
    look.digits,
    look.digits2,
    look.outline,
    look.glow > 0,
    look.digitsRoughness,
    look.digitsMetalness,
    look.tenColor,
    look.oneColor,
    look.tenIcon,
    look.oneIcon,
    look.roughness,
    look.metalness,
  ]);
}

/**
 * Paint the textures of a look.
 * `patternMap` is the pattern of a look whose pattern comes from a texture:
 * how much of the second color every pixel gets, 0 to 1.
 */
export function paintLook(
  look: DiceLook,
  shapes: Shapes,
  layout: PaintLayout,
  patternMap?: Float32Array
): PaintedTextures {
  const { width, height } = layout;
  const albedo = new Uint8ClampedArray(width * height * 4);
  const emissive = new Uint8ClampedArray(width * height * 4);
  const surface = new Uint8ClampedArray(width * height * 4);

  const body = parseColor(look.body);
  const body2 = parseColor(look.body2);
  const digitColor = parseColor(look.digits);
  const digitColor2 = look.digits2 ? parseColor(look.digits2) : null;
  const tenColor = look.tenColor ? parseColor(look.tenColor) : null;
  const oneColor = look.oneColor ? parseColor(look.oneColor) : null;
  const outlineColor = look.outline ? parseColor(look.outline) : null;
  const roughness = look.roughness * 255;
  const metalness = look.metalness * 255;
  const digitsRoughness = look.digitsRoughness * 255;
  const digitsMetalness = look.digitsMetalness * 255;
  const glows = look.glow > 0;
  const poleLength = layout.poleEnd - layout.poleStart;
  const drawn = isTexturePattern(look.pattern) ? null : look.pattern;
  const size = getDetailSize(look.patternScale);
  const color = [0, 0, 0];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      const i = pixel * 4;
      const digit = shapes.digits[pixel] / 255;
      const line = outlineColor ? shapes.outline[pixel] / 255 : 0;
      const mix =
        (drawn
          ? getPatternMix(
              drawn,
              x,
              y,
              (x - layout.poleStart) / poleLength,
              size
            )
          : patternMap
          ? patternMap[pixel]
          : 0) * look.patternStrength;

      // The color of the digit this pixel belongs to
      const own =
        digit === 0
          ? null
          : inside(layout.ten, x, y)
          ? tenColor
          : inside(layout.one, x, y)
          ? oneColor
          : null;
      for (let channel = 0; channel < 3; channel++) {
        color[channel] = own
          ? own[channel]
          : digitColor2
          ? digitColor[channel] +
            (digitColor2[channel] - digitColor[channel]) * mix
          : digitColor[channel];
      }

      for (let channel = 0; channel < 3; channel++) {
        let value = body[channel] + (body2[channel] - body[channel]) * mix;
        if (outlineColor) {
          value += (outlineColor[channel] - value) * line;
        }
        albedo[i + channel] = value + (color[channel] - value) * digit;
        emissive[i + channel] = glows ? color[channel] * digit : 0;
      }
      albedo[i + 3] = 255;
      emissive[i + 3] = 255;
      // What is painted on the body: the digit and the line around it
      const paint = Math.max(digit, line);
      surface[i] = 255 * (1 - paint);
      surface[i + 1] = roughness + (digitsRoughness - roughness) * paint;
      surface[i + 2] = metalness + (digitsMetalness - metalness) * paint;
      surface[i + 3] = 255;
    }
  }

  return { albedo, emissive, surface };
}

/** Blur with a box of the given radius, one pass in each direction */
export function blur(
  source: ArrayLike<number>,
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

/** A line a few pixels wide around the digits */
export function paintOutline(
  digits: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const spread = blur(digits, width, height, 4);
  const outline = new Uint8Array(width * height);
  for (let i = 0; i < outline.length; i++) {
    outline[i] = Math.min(255, spread[i] * 4) * (1 - digits[i] / 255);
  }
  return outline;
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

/**
 * Turn the brightness of a texture of the original dice into a pattern:
 * how much of the second color every pixel gets, 0 for the darkest parts of
 * the texture and 1 for the brightest.
 *
 * The digits are a part of those textures. `holes` marks the pixels of the
 * digits (anything but 0): they are filled in from what is around them,
 * otherwise an old "0" would show under the icon that replaces it.
 */
export function buildPatternMap(
  brightness: Float32Array,
  holes: Uint8Array,
  width: number,
  height: number
): Float32Array {
  const map = Float32Array.from(brightness);
  const known = new Uint8Array(width * height);
  let pending: number[] = [];
  for (let i = 0; i < known.length; i++) {
    if (holes[i]) {
      pending.push(i);
    } else {
      known[i] = 1;
    }
  }

  // Grow the known pixels into the holes one ring at a time
  while (pending.length > 0) {
    const filled: number[] = [];
    const values: number[] = [];
    const left: number[] = [];
    for (const i of pending) {
      const x = i % width;
      let sum = 0;
      let count = 0;
      if (x > 0 && known[i - 1]) {
        sum += map[i - 1];
        count++;
      }
      if (x < width - 1 && known[i + 1]) {
        sum += map[i + 1];
        count++;
      }
      if (i >= width && known[i - width]) {
        sum += map[i - width];
        count++;
      }
      if (i < known.length - width && known[i + width]) {
        sum += map[i + width];
        count++;
      }
      if (count > 0) {
        filled.push(i);
        values.push(sum / count);
      } else {
        left.push(i);
      }
    }
    if (filled.length === 0) {
      // Nothing known to grow from
      break;
    }
    for (let n = 0; n < filled.length; n++) {
      map[filled[n]] = values[n];
      known[filled[n]] = 1;
    }
    pending = left;
  }

  // Stretch to the whole range, ignoring the few darkest and brightest pixels
  const sample: number[] = [];
  for (let i = 0; i < map.length; i += 7) {
    if (!holes[i]) {
      sample.push(map[i]);
    }
  }
  sample.sort((a, b) => a - b);
  const low = sample[Math.floor(sample.length * 0.02)] ?? 0;
  const high = sample[Math.floor(sample.length * 0.98)] ?? 1;
  const range = high - low || 1;
  for (let i = 0; i < map.length; i++) {
    map[i] = Math.min(1, Math.max(0, (map[i] - low) / range));
  }
  return map;
}
