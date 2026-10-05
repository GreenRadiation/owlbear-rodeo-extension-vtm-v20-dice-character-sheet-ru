/**
 * Paints the textures of custom dice pixel by pixel.
 * Pure functions on arrays: no DOM, no three.js.
 *
 * Only what is drawn on the die is painted here: the digits, the icons and
 * the line around them. The body with its colors and its pattern is made by
 * the shader (see shader.ts): that way every die of a roll can get its own
 * take on the pattern without textures of its own.
 */

import { DiceLook, parseColor } from "../../dice/look";

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

/** How strong the engraving of the digits is in the normal map at its deepest */
const ENGRAVING = 0.9;

function inside(rect: Rect, x: number, y: number) {
  return (
    x >= rect.x &&
    x < rect.x + rect.width &&
    y >= rect.y &&
    y < rect.y + rect.height
  );
}

export interface PaintedTextures {
  /**
   * What is painted on the body, sRGB: the color of the digit or of the line
   * around it, and in the alpha how much of the pixel is painted.
   */
  albedo: Uint8ClampedArray;
  /** The glow of the digits, sRGB */
  emissive: Uint8ClampedArray;
  /**
   * Red: 255 on the body and 0 on what is painted on it. Tells where light
   * passes through dice of glass and where the lacquer of the body is.
   * Green: roughness. Blue: metalness.
   * Alpha: 255 where a digit takes the pattern of the body with its second color.
   */
  surface: Uint8ClampedArray;
}

/**
 * The part of a look that changes what is painted.
 * The rest of a look is handled by the material and the shader and needs no new textures.
 */
export function getPaintKey(look: DiceLook) {
  return JSON.stringify([
    look.digits,
    look.outline,
    look.outline ? look.outlineWidth : 0,
    look.font,
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

/** Paint the textures of a look */
export function paintLook(
  look: DiceLook,
  shapes: Shapes,
  layout: PaintLayout
): PaintedTextures {
  const { width, height } = layout;
  const albedo = new Uint8ClampedArray(width * height * 4);
  const emissive = new Uint8ClampedArray(width * height * 4);
  const surface = new Uint8ClampedArray(width * height * 4);

  const digitColor = parseColor(look.digits);
  const tenColor = look.tenColor ? parseColor(look.tenColor) : null;
  const oneColor = look.oneColor ? parseColor(look.oneColor) : null;
  const outlineColor = look.outline ? parseColor(look.outline) : null;
  const roughness = look.roughness * 255;
  const metalness = look.metalness * 255;
  const digitsRoughness = look.digitsRoughness * 255;
  const digitsMetalness = look.digitsMetalness * 255;
  const glows = look.glow > 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      const i = pixel * 4;
      const digit = shapes.digits[pixel] / 255;
      const line = outlineColor ? shapes.outline[pixel] / 255 : 0;
      // What is painted on the body: the digit and the line around it
      const paint = Math.max(digit, line);

      // The color of the digit this pixel belongs to
      const own =
        digit === 0
          ? null
          : inside(layout.ten, x, y)
          ? tenColor
          : inside(layout.one, x, y)
          ? oneColor
          : null;
      const color = own || digitColor;

      for (let channel = 0; channel < 3; channel++) {
        // The line shows where the digit doesn't cover it
        albedo[i + channel] =
          outlineColor && paint > 0
            ? outlineColor[channel] +
              (color[channel] - outlineColor[channel]) * (digit / paint)
            : color[channel];
        emissive[i + channel] = glows ? color[channel] * digit : 0;
      }
      albedo[i + 3] = paint * 255;
      emissive[i + 3] = 255;
      surface[i] = 255 * (1 - paint);
      surface[i + 1] = roughness + (digitsRoughness - roughness) * paint;
      surface[i + 2] = metalness + (digitsMetalness - metalness) * paint;
      surface[i + 3] = own ? 0 : 255;
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

/** How wide the line around the digits is in pixels for the width of a look */
export function getOutlineRadius(outlineWidth: number) {
  return Math.round(2 + outlineWidth * 8);
}

/** How wide the slope at the edge of a digit is in pixels for the bevel of a look */
export function getBevelRadius(bevel: number) {
  return Math.round(1 + bevel * 6);
}

/** A line around the digits, `radius` pixels wide */
export function paintOutline(
  digits: Uint8Array,
  width: number,
  height: number,
  radius: number
): Uint8Array {
  const spread = blur(digits, width, height, radius);
  const outline = new Uint8Array(width * height);
  // A pixel next to a digit sees about a half of the box of the blur filled
  const gain = (radius * 2 + 1) / 2;
  for (let i = 0; i < outline.length; i++) {
    outline[i] = Math.min(255, spread[i] * gain) * (1 - digits[i] / 255);
  }
  return outline;
}

/**
 * The normal map that engraves the digits into the die.
 * Has the same shape as the normal maps of the original dice: a digit to the
 * right of a pixel makes its red go up, a digit below makes its green go down.
 * `radius` is how wide the slope at the edge of a digit is.
 */
export function paintNormals(
  digits: Uint8Array,
  width: number,
  height: number,
  radius = 2
): Uint8ClampedArray {
  const depth = blur(digits, width, height, radius);
  const normals = new Uint8ClampedArray(width * height * 4);
  const at = (x: number, y: number) =>
    depth[
      Math.min(height - 1, Math.max(0, y)) * width +
        Math.min(width - 1, Math.max(0, x))
    ];
  // The slope of the edge: the same depth spread over a wider edge is gentler
  const slope = (ENGRAVING * 2.5) / (radius * 2 + 1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const dx = (at(x + 1, y) - at(x - 1, y)) * slope;
      const dy = (at(x, y - 1) - at(x, y + 1)) * slope;
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
 * the texture and 255 for the brightest, as the pixels of a gray texture.
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
): Uint8ClampedArray {
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
  const result = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < map.length; i++) {
    const value = Math.min(1, Math.max(0, (map[i] - low) / range)) * 255;
    result[i * 4] = value;
    result[i * 4 + 1] = value;
    result[i * 4 + 2] = value;
    result[i * 4 + 3] = 255;
  }
  return result;
}
