import { describe, expect, it } from "vitest";

import { DEFAULT_LOOK, DiceLook } from "../../dice/look";
import {
  PaintLayout,
  Shapes,
  buildPatternMap,
  getBevelRadius,
  getOutlineRadius,
  getPaintKey,
  paintLook,
  paintNormals,
  paintOutline,
} from "./paint";

describe("paintLook", () => {
  // Four pixels in a row: body, the ten, the one, another digit
  const layout: PaintLayout = {
    width: 4,
    height: 1,
    ten: { x: 1, y: 0, width: 1, height: 1 },
    one: { x: 2, y: 0, width: 1, height: 1 },
  };
  const digits: Shapes = {
    digits: new Uint8Array([0, 255, 255, 255]),
    outline: new Uint8Array(4),
  };
  const look: DiceLook = {
    ...DEFAULT_LOOK,
    digits: "#00ff00",
    outline: "",
    tenColor: "#ff0000",
    oneColor: "",
    glow: 0,
    roughness: 0.2,
    metalness: 1,
    digitsRoughness: 0.8,
    digitsMetalness: 0,
  };
  const pixel = (data: Uint8ClampedArray, index: number) =>
    Array.from(data.slice(index * 4, index * 4 + 4));

  it("paints the digits in their colors and nothing on the body", () => {
    const { albedo } = paintLook(look, digits, layout);
    expect(albedo[3]).toBe(0);
    expect(pixel(albedo, 1)).toEqual([255, 0, 0, 255]);
    // No color of its own: the color of the digits
    expect(pixel(albedo, 2)).toEqual([0, 255, 0, 255]);
    expect(pixel(albedo, 3)).toEqual([0, 255, 0, 255]);
  });

  it("only glows when asked to and only in the digits", () => {
    expect(pixel(paintLook(look, digits, layout).emissive, 1)).toEqual([
      0, 0, 0, 255,
    ]);
    const { emissive } = paintLook({ ...look, glow: 0.5 }, digits, layout);
    expect(pixel(emissive, 0)).toEqual([0, 0, 0, 255]);
    expect(pixel(emissive, 1)).toEqual([255, 0, 0, 255]);
    expect(pixel(emissive, 3)).toEqual([0, 255, 0, 255]);
  });

  it("gives the body the surface of the look and the digits their own", () => {
    const { surface } = paintLook(look, digits, layout);
    // Lets light through, as rough and as metallic as asked
    expect(pixel(surface, 0)).toEqual([255, 51, 255, 255]);
    // Painted over: as rough and as metallic as the digits are set to be
    expect(pixel(surface, 3)).toEqual([0, 204, 0, 255]);
    const golden = paintLook(
      { ...look, digitsRoughness: 0.2, digitsMetalness: 1 },
      digits,
      layout
    ).surface;
    expect(pixel(golden, 3)).toEqual([0, 51, 255, 255]);
  });

  it("marks the digits that can take the pattern of the body", () => {
    const { surface } = paintLook(look, digits, layout);
    // The ten has a color of its own and keeps it
    expect(surface[1 * 4 + 3]).toBe(0);
    expect(surface[2 * 4 + 3]).toBe(255);
    expect(surface[3 * 4 + 3]).toBe(255);
  });

  it("draws the line around the digits when it has a color", () => {
    const lined: Shapes = {
      digits: new Uint8Array([0, 0, 0, 255]),
      outline: new Uint8Array([255, 128, 0, 0]),
    };
    expect(paintLook(look, lined, layout).albedo[3]).toBe(0);
    const painted = paintLook({ ...look, outline: "#ffffff" }, lined, layout);
    expect(pixel(painted.albedo, 0)).toEqual([255, 255, 255, 255]);
    expect(painted.albedo[1 * 4 + 3]).toBe(128);
    // The line is paint like the digits
    expect(pixel(painted.surface, 0)).toEqual([0, 204, 0, 255]);
    // The digit itself keeps its color
    expect(pixel(painted.albedo, 3)).toEqual([0, 255, 0, 255]);
  });
});

describe("getPaintKey", () => {
  it("only changes with what is painted", () => {
    const key = getPaintKey(DEFAULT_LOOK);
    // Handled by the material and the shader, the textures stay
    expect(getPaintKey({ ...DEFAULT_LOOK, clearcoat: 0.1 })).toBe(key);
    expect(getPaintKey({ ...DEFAULT_LOOK, engraving: -1 })).toBe(key);
    expect(getPaintKey({ ...DEFAULT_LOOK, body: "#000000" })).toBe(key);
    expect(getPaintKey({ ...DEFAULT_LOOK, pattern: "rings" })).toBe(key);
    expect(getPaintKey({ ...DEFAULT_LOOK, unique: true })).toBe(key);
    expect(getPaintKey({ ...DEFAULT_LOOK, glow: 0 })).toBe(key);
    // Painted
    expect(getPaintKey({ ...DEFAULT_LOOK, digits: "#000000" })).not.toBe(key);
    expect(getPaintKey({ ...DEFAULT_LOOK, roughness: 0.9 })).not.toBe(key);
    expect(getPaintKey({ ...DEFAULT_LOOK, glow: 0.5 })).not.toBe(key);
    expect(getPaintKey({ ...DEFAULT_LOOK, tenIcon: "" })).not.toBe(key);
    expect(getPaintKey({ ...DEFAULT_LOOK, font: "gothic" })).not.toBe(key);
    // The width of a line that isn't drawn doesn't matter
    expect(getPaintKey({ ...DEFAULT_LOOK, outlineWidth: 0.9 })).toBe(key);
    expect(
      getPaintKey({ ...DEFAULT_LOOK, outline: "#000000", outlineWidth: 0.9 })
    ).not.toBe(getPaintKey({ ...DEFAULT_LOOK, outline: "#000000" }));
  });
});

describe("radii", () => {
  it("grow with the sliders", () => {
    expect(getOutlineRadius(0)).toBe(2);
    expect(getOutlineRadius(1)).toBe(10);
    expect(getBevelRadius(0)).toBe(1);
    expect(getBevelRadius(1)).toBe(7);
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
    const outline = paintOutline(digits, width, width, 4);
    expect(outline[10 * width + 10]).toBe(0);
    expect(outline[10 * width + 7]).toBeGreaterThan(200);
    expect(outline[10 * width + 1]).toBe(0);
    // A wider line reaches further
    const wide = paintOutline(digits, width, width, 8);
    expect(wide[10 * width + 2]).toBeGreaterThan(0);
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

  it("spreads a wider bevel over more pixels with a gentler slope", () => {
    const width = 24;
    const digits = new Uint8Array(width * width);
    for (let y = 0; y < width; y++) {
      for (let x = 12; x < width; x++) {
        digits[y * width + x] = 255;
      }
    }
    const narrow = paintNormals(digits, width, width, 1);
    const wide = paintNormals(digits, width, width, 6);
    const at = (normals: Uint8ClampedArray, x: number) =>
      normals[(5 * width + x) * 4];
    expect(at(narrow, 11)).toBeGreaterThan(at(wide, 11));
    expect(at(narrow, 5)).toBe(128);
    expect(at(wide, 5)).toBeGreaterThan(128);
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
    expect(map[99 * 4]).toBe(255);
    expect(map[50 * 4]).toBeGreaterThan(100);
    expect(map[50 * 4]).toBeLessThan(155);
    expect(map[3]).toBe(255);
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
    expect(map[(4 * width + 4) * 4]).toBe(map[(4 * width + 1) * 4]);
  });
});
