import { describe, expect, it } from "vitest";

import { DEFAULT_LOOK, DRAWN_PATTERNS, DiceLook } from "../../dice/look";
import {
  PaintLayout,
  Shapes,
  buildPatternMap,
  getDetailSize,
  getPaintKey,
  getPatternMix,
  paintLook,
  paintNormals,
  paintOutline,
} from "./paint";

describe("getPatternMix", () => {
  it("stays between the two colors", () => {
    for (const pattern of DRAWN_PATTERNS) {
      for (let i = 0; i < 400; i++) {
        const x = (i * 37) % 512;
        const y = (i * 91) % 1104;
        const mix = getPatternMix(pattern, x, y, x / 512);
        expect(mix).toBeGreaterThanOrEqual(0);
        expect(mix).toBeLessThanOrEqual(1);
      }
    }
  });

  it("is the same every time", () => {
    for (const pattern of DRAWN_PATTERNS) {
      expect(getPatternMix(pattern, 123, 456, 0.3)).toBe(
        getPatternMix(pattern, 123, 456, 0.3)
      );
    }
  });

  it("goes from one pole to the other", () => {
    expect(getPatternMix("solid", 5, 5, 0.9)).toBe(0);
    expect(getPatternMix("gradient", 0, 0, 0)).toBe(0);
    expect(getPatternMix("gradient", 0, 0, 1)).toBe(1);
    expect(getPatternMix("gradient", 0, 0, 0.3)).toBeLessThan(
      getPatternMix("gradient", 0, 0, 0.6)
    );
    expect(getPatternMix("halves", 0, 0, 0.2)).toBe(0);
    expect(getPatternMix("halves", 0, 0, 0.8)).toBe(1);
  });

  it("uses both colors in every pattern but the solid one", () => {
    for (const pattern of DRAWN_PATTERNS) {
      if (pattern === "solid") {
        continue;
      }
      let low = 1;
      let high = 0;
      for (let y = 0; y < 300; y += 3) {
        for (let x = 0; x < 300; x += 3) {
          const mix = getPatternMix(pattern, x, y, x / 300);
          low = Math.min(low, mix);
          high = Math.max(high, mix);
        }
      }
      expect(low).toBeLessThan(0.1);
      expect(high).toBeGreaterThan(0.9);
    }
  });
});

describe("paintLook", () => {
  // Four pixels in a row: body, the ten, the one, another digit
  const layout: PaintLayout = {
    width: 4,
    height: 1,
    poleStart: 0,
    poleEnd: 4,
    ten: { x: 1, y: 0, width: 1, height: 1 },
    one: { x: 2, y: 0, width: 1, height: 1 },
  };
  const digits: Shapes = {
    digits: new Uint8Array([0, 255, 255, 255]),
    outline: new Uint8Array(4),
  };
  const blank: Shapes = {
    digits: new Uint8Array(4),
    outline: new Uint8Array(4),
  };
  const look: DiceLook = {
    ...DEFAULT_LOOK,
    body: "#102030",
    body2: "#ffffff",
    pattern: "solid",
    digits: "#00ff00",
    digits2: "",
    outline: "",
    digitsRoughness: 0.8,
    digitsMetalness: 0,
    tenColor: "#ff0000",
    oneColor: "",
    glow: 0,
    roughness: 0.2,
    metalness: 1,
  };
  const pixel = (data: Uint8ClampedArray, index: number) =>
    Array.from(data.slice(index * 4, index * 4 + 3));

  it("paints the body and the digits in their colors", () => {
    const { albedo } = paintLook(look, digits, layout);
    expect(pixel(albedo, 0)).toEqual([16, 32, 48]);
    expect(pixel(albedo, 1)).toEqual([255, 0, 0]);
    // No color of its own: the color of the digits
    expect(pixel(albedo, 2)).toEqual([0, 255, 0]);
    expect(pixel(albedo, 3)).toEqual([0, 255, 0]);
  });

  it("only glows when asked to and only in the digits", () => {
    expect(pixel(paintLook(look, digits, layout).emissive, 1)).toEqual([
      0, 0, 0,
    ]);
    const { emissive } = paintLook({ ...look, glow: 0.5 }, digits, layout);
    expect(pixel(emissive, 0)).toEqual([0, 0, 0]);
    expect(pixel(emissive, 1)).toEqual([255, 0, 0]);
    expect(pixel(emissive, 3)).toEqual([0, 255, 0]);
  });

  it("gives the body the surface of the look and the digits a painted one", () => {
    const { surface } = paintLook(look, digits, layout);
    // Lets light through, as rough and as metallic as asked
    expect(pixel(surface, 0)).toEqual([255, 51, 255]);
    // Painted over: as rough and as metallic as the digits are set to be
    expect(pixel(surface, 3)).toEqual([0, 204, 0]);
    const golden = paintLook(
      { ...look, digitsRoughness: 0.2, digitsMetalness: 1 },
      digits,
      layout
    ).surface;
    expect(pixel(golden, 3)).toEqual([0, 51, 255]);
  });

  it("mixes in the second color by the strength of the pattern", () => {
    const patterned = { ...look, pattern: "halves" as const };
    const full = paintLook(
      { ...patterned, patternStrength: 1 },
      blank,
      layout
    ).albedo;
    expect(pixel(full, 0)).toEqual([16, 32, 48]);
    expect(pixel(full, 3)).toEqual([255, 255, 255]);
    const none = paintLook(
      { ...patterned, patternStrength: 0 },
      blank,
      layout
    ).albedo;
    expect(pixel(none, 3)).toEqual([16, 32, 48]);
  });

  it("takes the pattern of a texture from its map", () => {
    const map = new Float32Array([0, 0.5, 1, 1]);
    const { albedo } = paintLook(
      { ...look, pattern: "galaxy", patternStrength: 1 },
      blank,
      layout,
      map
    );
    expect(pixel(albedo, 0)).toEqual([16, 32, 48]);
    expect(pixel(albedo, 1)).toEqual([136, 144, 152]);
    expect(pixel(albedo, 2)).toEqual([255, 255, 255]);
  });

  it("puts the pattern on the digits when they have a second color", () => {
    const { albedo } = paintLook(
      {
        ...look,
        pattern: "halves",
        patternStrength: 1,
        digits2: "#0000ff",
        tenColor: "",
      },
      digits,
      layout
    );
    // The first half of the die has the first color, the second half the second one
    expect(pixel(albedo, 1)).toEqual([0, 255, 0]);
    expect(pixel(albedo, 3)).toEqual([0, 0, 255]);
  });

  it("draws the line around the digits when it has a color", () => {
    const lined: Shapes = {
      digits: new Uint8Array(4),
      outline: new Uint8Array([255, 0, 0, 0]),
    };
    expect(pixel(paintLook(look, lined, layout).albedo, 0)).toEqual([
      16, 32, 48,
    ]);
    const painted = paintLook({ ...look, outline: "#ffffff" }, lined, layout);
    expect(pixel(painted.albedo, 0)).toEqual([255, 255, 255]);
    // The line is paint like the digits
    expect(pixel(painted.surface, 0)).toEqual([0, 204, 0]);
  });
});

describe("getPaintKey", () => {
  it("only changes with what is painted", () => {
    const key = getPaintKey(DEFAULT_LOOK);
    // Set up in the material, the textures stay
    expect(getPaintKey({ ...DEFAULT_LOOK, clearcoat: 0.1 })).toBe(key);
    expect(getPaintKey({ ...DEFAULT_LOOK, engraving: -1 })).toBe(key);
    expect(getPaintKey({ ...DEFAULT_LOOK, iridescenceHue: 0.9 })).toBe(key);
    expect(getPaintKey({ ...DEFAULT_LOOK, glow: 0 })).toBe(key);
    // Painted
    expect(getPaintKey({ ...DEFAULT_LOOK, body: "#000000" })).not.toBe(key);
    expect(getPaintKey({ ...DEFAULT_LOOK, roughness: 0.9 })).not.toBe(key);
    expect(getPaintKey({ ...DEFAULT_LOOK, glow: 0.5 })).not.toBe(key);
    expect(getPaintKey({ ...DEFAULT_LOOK, tenIcon: "" })).not.toBe(key);
  });
});

describe("getDetailSize", () => {
  it("is the usual size in the middle of the slider", () => {
    expect(getDetailSize(0.5)).toBe(1);
    expect(getDetailSize(0)).toBeCloseTo(1 / 3);
    expect(getDetailSize(1)).toBeCloseTo(3);
  });
});

describe("paintOutline", () => {
  it("is around the digits and not on them", () => {
    const width = 20;
    const digits = new Uint8Array(width * width);
    for (let y = 8; y < 12; y++) {
      for (let x = 8; x < 12; x++) {
        digits[y * width + x] = 255;
      }
    }
    const outline = paintOutline(digits, width, width);
    expect(outline[10 * width + 10]).toBe(0);
    expect(outline[10 * width + 7]).toBeGreaterThan(200);
    expect(outline[10 * width + 1]).toBe(0);
  });
});

describe("buildPatternMap", () => {
  it("stretches the brightness to the whole range", () => {
    const brightness = new Float32Array(100);
    for (let i = 0; i < 100; i++) {
      brightness[i] = 50 + i;
    }
    const map = buildPatternMap(brightness, new Uint8Array(100), 10, 10);
    expect(map[0]).toBe(0);
    expect(map[99]).toBe(1);
    expect(map[50]).toBeGreaterThan(0.4);
    expect(map[50]).toBeLessThan(0.6);
  });

  it("fills the digits of the texture in from what is around them", () => {
    // A flat texture with a bright digit in the middle
    const width = 9;
    const brightness = new Float32Array(width * width).fill(100);
    const holes = new Uint8Array(width * width);
    for (let y = 3; y < 6; y++) {
      for (let x = 3; x < 6; x++) {
        brightness[y * width + x] = 255;
        holes[y * width + x] = 1;
      }
    }
    // Something to stretch between
    brightness[0] = 0;
    brightness[1] = 200;
    const map = buildPatternMap(brightness, holes, width, width);
    // The digit is gone: its pixels are like the ones around it
    expect(map[4 * width + 4]).toBeCloseTo(map[4 * width + 1], 5);
  });
});

describe("paintNormals", () => {
  it("is flat where there are no digits", () => {
    const normals = paintNormals(new Uint8Array(25), 5, 5);
    expect(Array.from(normals.slice(0, 4))).toEqual([128, 128, 255, 255]);
  });

  it("leans the same way as the normals of the original dice", () => {
    // A digit in the right half
    const width = 12;
    const digits = new Uint8Array(width * width);
    for (let y = 0; y < width; y++) {
      for (let x = 6; x < width; x++) {
        digits[y * width + x] = 255;
      }
    }
    const normals = paintNormals(digits, width, width);
    // A digit to the right of a pixel turns its red up, the green is untouched
    const edge = (5 * width + 5) * 4;
    expect(normals[edge]).toBeGreaterThan(140);
    expect(normals[edge + 1]).toBe(128);

    // A digit below a pixel turns its green down
    const below = new Uint8Array(width * width);
    for (let y = 6; y < width; y++) {
      for (let x = 0; x < width; x++) {
        below[y * width + x] = 255;
      }
    }
    const belowNormals = paintNormals(below, width, width);
    expect(belowNormals[edge + 1]).toBeLessThan(116);
    expect(belowNormals[edge]).toBe(128);
  });
});
