import { describe, expect, it } from "vitest";

import { DEFAULT_LOOK, DiceLook, PATTERNS } from "../../dice/look";
import { PaintLayout, getPatternMix, paintLook, paintNormals } from "./paint";

describe("getPatternMix", () => {
  it("stays between the two colors", () => {
    for (const pattern of PATTERNS) {
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
    for (const pattern of PATTERNS) {
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
    for (const pattern of PATTERNS) {
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
  const digits = new Uint8Array([0, 255, 255, 255]);
  const look: DiceLook = {
    ...DEFAULT_LOOK,
    body: "#102030",
    body2: "#ffffff",
    pattern: "solid",
    digits: "#00ff00",
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
    // Solid, rough and not a metal
    expect(pixel(surface, 3)).toEqual([0, 210, 0]);
  });

  it("mixes in the second color by the strength of the pattern", () => {
    const patterned = { ...look, pattern: "halves" as const };
    const full = paintLook(
      { ...patterned, patternStrength: 1 },
      new Uint8Array(4),
      layout
    ).albedo;
    expect(pixel(full, 0)).toEqual([16, 32, 48]);
    expect(pixel(full, 3)).toEqual([255, 255, 255]);
    const none = paintLook(
      { ...patterned, patternStrength: 0 },
      new Uint8Array(4),
      layout
    ).albedo;
    expect(pixel(none, 3)).toEqual([16, 32, 48]);
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
