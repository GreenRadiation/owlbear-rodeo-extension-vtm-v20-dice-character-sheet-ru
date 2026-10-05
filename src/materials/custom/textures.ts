import * as THREE from "three";

import { DiceLook, isTexturePattern } from "../../dice/look";
import {
  PaintLayout,
  Shapes,
  blur,
  buildPatternMap,
  getPaintKey,
  paintLook,
  paintNormals,
  paintOutline,
} from "./paint";

/**
 * Builds the textures of custom dice.
 *
 * All the dice of the original roller share one texture atlas of 2048 pixels.
 * A D10 only uses a strip of it, so the textures made here only cover that
 * strip and are moved in place with the transform of the texture.
 *
 * The digits come from the mask of the glass dice: an image of the atlas where
 * the red channel is 0 on a digit and 255 everywhere else.
 */

const ATLAS_SIZE = 2048;
/** The part of the atlas with all the faces of a D10, measured from the UVs of its meshes */
const CROP = { x: 1184, y: 576, width: 512, height: 1104 };

/** How big an icon is drawn, in pixels of the atlas: a bit bigger than a digit */
const ICON_SIZE = 96;

/**
 * Where the "0" and the "1" of a D10 are on the atlas and which way is up
 * for them, as a turn of an upright image in radians.
 * Found by looking for the shapes of the digits in the mask.
 */
const TEN = { x: 1364.5, y: 872, turn: -Math.PI / 2 };
const ONE = { x: 1523.5, y: 1556.5, turn: Math.PI / 2 };

/** The square around a digit that is cleared for an icon and gets the color of that digit */
function getDigitRect(digit: { x: number; y: number }) {
  const size = ICON_SIZE + 4;
  return {
    x: Math.round(digit.x - CROP.x - size / 2),
    y: Math.round(digit.y - CROP.y - size / 2),
    width: size,
    height: size,
  };
}

const LAYOUT: PaintLayout = {
  width: CROP.width,
  height: CROP.height,
  // The faces of a D10 go from x 1218 to x 1675 of the atlas
  poleStart: 1218 - CROP.x,
  poleEnd: 1675 - CROP.x,
  ten: getDigitRect(TEN),
  one: getDigitRect(ONE),
};

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw Error("Unable to draw the textures of the dice");
  }
  return context;
}

/** The pixels of the strip of a D10 of an image of the atlas */
function getStrip(image: HTMLImageElement) {
  const context = createCanvas(CROP.width, CROP.height);
  // The image may come in another size than the atlas it was made for
  const scale = image.naturalWidth / ATLAS_SIZE;
  context.drawImage(
    image,
    CROP.x * scale,
    CROP.y * scale,
    CROP.width * scale,
    CROP.height * scale,
    0,
    0,
    CROP.width,
    CROP.height
  );
  return context.getImageData(0, 0, CROP.width, CROP.height).data;
}

/** Replace a digit with an icon */
function stampIcon(
  digits: Uint8Array,
  digit: { x: number; y: number; turn: number },
  icon: HTMLImageElement
) {
  const rect = getDigitRect(digit);
  const context = createCanvas(rect.width, rect.height);
  context.translate(rect.width / 2, rect.height / 2);
  context.rotate(digit.turn);
  context.drawImage(icon, -ICON_SIZE / 2, -ICON_SIZE / 2, ICON_SIZE, ICON_SIZE);
  const pixels = context.getImageData(0, 0, rect.width, rect.height).data;
  for (let y = 0; y < rect.height; y++) {
    for (let x = 0; x < rect.width; x++) {
      // Only the opacity of an icon matters
      digits[(rect.y + y) * CROP.width + rect.x + x] =
        pixels[(y * rect.width + x) * 4 + 3];
    }
  }
}

/** How much of every pixel of the strip is a digit, 0 to 255: the digits of the original dice */
let originalDigits: Uint8Array | undefined;

function getOriginalDigits(mask: HTMLImageElement) {
  if (!originalDigits) {
    const pixels = getStrip(mask);
    originalDigits = new Uint8Array(CROP.width * CROP.height);
    for (let i = 0; i < originalDigits.length; i++) {
      originalDigits[i] = 255 - pixels[i * 4];
    }
  }
  return originalDigits;
}

function createTexture(data: Uint8ClampedArray, srgb: boolean) {
  const texture = new THREE.DataTexture(
    data,
    CROP.width,
    CROP.height,
    THREE.RGBAFormat
  );
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
  // Same as the textures of the original dice: made for a GLTF model
  texture.flipY = false;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  // Put the strip where it is on the atlas
  texture.repeat.set(ATLAS_SIZE / CROP.width, ATLAS_SIZE / CROP.height);
  texture.offset.set(-CROP.x / CROP.width, -CROP.y / CROP.height);
  texture.needsUpdate = true;
  return texture;
}

export interface LookTextures {
  map: THREE.Texture;
  emissiveMap: THREE.Texture;
  /**
   * Red: 255 on the body and 0 on what is painted on it.
   * Green: roughness. Blue: metalness.
   */
  surfaceMap: THREE.Texture;
  normalMap: THREE.Texture;
}

interface ShapeTextures extends Shapes {
  normalMap: THREE.Texture;
}

/**
 * Painting takes a moment and all the dice of a roll look the same,
 * so what was painted is kept. Only the last few looks: a player who drags
 * a color in the settings goes through a lot of them.
 */
const MAX_SHAPES = 8;
const MAX_LOOKS = 8;
const MAX_PATTERN_MAPS = 3;
const shapesCache = new Map<string, ShapeTextures>();
const lookCache = new Map<string, LookTextures>();
const patternMapCache = new Map<string, Float32Array>();

/** Get a value of a cache and mark it as the one used last */
function touch<T>(cache: Map<string, T>, key: string): T | undefined {
  const value = cache.get(key);
  if (value !== undefined) {
    cache.delete(key);
    cache.set(key, value);
  }
  return value;
}

/** Add a value to a cache and drop the one that wasn't used the longest when there are too many */
function remember<T>(
  cache: Map<string, T>,
  key: string,
  value: T,
  max: number,
  dispose?: (value: T) => void
) {
  cache.set(key, value);
  if (cache.size > max) {
    const oldest = cache.keys().next().value as string;
    const dropped = cache.get(oldest) as T;
    cache.delete(oldest);
    // A texture that is still on a die gets uploaded again when it is drawn
    dispose?.(dropped);
  }
}

/** The pattern of a texture of the original dice */
function getPatternMap(
  pattern: string,
  image: HTMLImageElement,
  mask: HTMLImageElement
) {
  let map = touch(patternMapCache, pattern);
  if (!map) {
    const pixels = getStrip(image);
    const brightness = new Float32Array(CROP.width * CROP.height);
    for (let i = 0; i < brightness.length; i++) {
      brightness[i] =
        pixels[i * 4] * 0.299 +
        pixels[i * 4 + 1] * 0.587 +
        pixels[i * 4 + 2] * 0.114;
    }
    // The digits of the texture and a few pixels around them
    const spread = blur(getOriginalDigits(mask), CROP.width, CROP.height, 3);
    const holes = new Uint8Array(spread.length);
    for (let i = 0; i < holes.length; i++) {
      holes[i] = spread[i] > 4 ? 1 : 0;
    }
    map = buildPatternMap(brightness, holes, CROP.width, CROP.height);
    remember(patternMapCache, pattern, map, MAX_PATTERN_MAPS);
  }
  return map;
}

/**
 * The textures for a look.
 * The icons are the images of the icons of the look, if it has them.
 * The pattern is the texture of the original dice the look takes its pattern from, if it does.
 */
export function getLookTextures(
  look: DiceLook,
  mask: HTMLImageElement,
  tenIcon?: HTMLImageElement,
  oneIcon?: HTMLImageElement,
  pattern?: HTMLImageElement
): LookTextures {
  const lookKey = getPaintKey(look);
  const cached = touch(lookCache, lookKey);
  if (cached) {
    return cached;
  }

  const shapesKey = `${look.tenIcon}|${look.oneIcon}`;
  let shapes = touch(shapesCache, shapesKey);
  if (!shapes) {
    const digits = Uint8Array.from(getOriginalDigits(mask));
    if (tenIcon) {
      stampIcon(digits, TEN, tenIcon);
    }
    if (oneIcon) {
      stampIcon(digits, ONE, oneIcon);
    }
    shapes = {
      digits,
      outline: paintOutline(digits, CROP.width, CROP.height),
      normalMap: createTexture(
        paintNormals(digits, CROP.width, CROP.height),
        false
      ),
    };
    remember(shapesCache, shapesKey, shapes, MAX_SHAPES, (dropped) =>
      dropped.normalMap.dispose()
    );
  }

  const patternMap =
    isTexturePattern(look.pattern) && pattern
      ? getPatternMap(look.pattern, pattern, mask)
      : undefined;
  const painted = paintLook(look, shapes, LAYOUT, patternMap);
  const textures: LookTextures = {
    map: createTexture(painted.albedo, true),
    emissiveMap: createTexture(painted.emissive, true),
    surfaceMap: createTexture(painted.surface, false),
    normalMap: shapes.normalMap,
  };
  remember(lookCache, lookKey, textures, MAX_LOOKS, (dropped) => {
    dropped.map.dispose();
    dropped.emissiveMap.dispose();
    dropped.surfaceMap.dispose();
  });
  return textures;
}
