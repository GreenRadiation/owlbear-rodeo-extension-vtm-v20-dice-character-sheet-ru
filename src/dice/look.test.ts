import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOOK,
  FINISHES,
  PATTERNS,
  parseColor,
  randomLook,
  sanitizeLook,
} from "./look";

const ICONS = ["ankh", "skull", "star"];

describe("sanitizeLook", () => {
  it("gives the default look for anything that isn't a look", () => {
    expect(sanitizeLook(undefined, ICONS)).toEqual(DEFAULT_LOOK);
    expect(sanitizeLook("red", ICONS)).toEqual(DEFAULT_LOOK);
    expect(sanitizeLook(null, ICONS)).toEqual(DEFAULT_LOOK);
  });

  it("keeps a valid look as it is", () => {
    const look = {
      body: "#102030",
      body2: "#ffffff",
      pattern: "rings",
      patternStrength: 0.35,
      digits: "#000000",
      glow: 1,
      tenColor: "",
      oneColor: "#ff0000",
      tenIcon: "",
      oneIcon: "star",
      finish: "glass",
      roughness: 0,
      metalness: 0.5,
    };
    expect(sanitizeLook(look, ICONS)).toEqual(look);
  });

  it("replaces what is wrong and clamps numbers", () => {
    const look = sanitizeLook(
      {
        body: "red",
        body2: "#FFAA00",
        pattern: "zebra",
        patternStrength: 7,
        digits: 5,
        glow: -1,
        tenColor: "#12345",
        finish: "wood",
        roughness: Number.NaN,
        metalness: "1",
      },
      ICONS
    );
    expect(look.body).toBe(DEFAULT_LOOK.body);
    // Colors are kept in lower case
    expect(look.body2).toBe("#ffaa00");
    expect(look.pattern).toBe(DEFAULT_LOOK.pattern);
    expect(look.patternStrength).toBe(1);
    expect(look.digits).toBe(DEFAULT_LOOK.digits);
    expect(look.glow).toBe(0);
    expect(look.tenColor).toBe(DEFAULT_LOOK.tenColor);
    expect(look.finish).toBe(DEFAULT_LOOK.finish);
    expect(look.roughness).toBe(DEFAULT_LOOK.roughness);
    expect(look.metalness).toBe(DEFAULT_LOOK.metalness);
  });

  it("shows the digit for an icon it doesn't have", () => {
    // An icon of a newer version of the extension
    expect(sanitizeLook({ tenIcon: "rose" }, ICONS).tenIcon).toBe("");
    // The default icons only when they exist
    expect(sanitizeLook({}, ICONS).tenIcon).toBe("ankh");
    expect(sanitizeLook({}, []).tenIcon).toBe("");
    expect(sanitizeLook({}, []).oneIcon).toBe("");
  });
});

describe("randomLook", () => {
  /** The same numbers every time */
  function seeded(seed: number) {
    return () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  it("makes valid looks", () => {
    for (let seed = 1; seed < 60; seed++) {
      const look = randomLook(ICONS, seeded(seed));
      expect(sanitizeLook(look, ICONS)).toEqual(look);
      expect(PATTERNS).toContain(look.pattern);
      expect(FINISHES).toContain(look.finish);
    }
  });

  it("keeps the digits readable on the body", () => {
    const brightness = (hex: string) => {
      const [r, g, b] = parseColor(hex);
      return (r * 299 + g * 587 + b * 114) / 1000;
    };
    for (let seed = 1; seed < 60; seed++) {
      const look = randomLook(ICONS, seeded(seed));
      expect(
        Math.abs(brightness(look.digits) - brightness(look.body))
      ).toBeGreaterThan(90);
    }
  });

  it("works without icons", () => {
    const look = randomLook([], seeded(5));
    expect(look.tenIcon).toBe("");
    expect(look.oneIcon).toBe("");
  });
});

describe("parseColor", () => {
  it("reads the channels", () => {
    expect(parseColor("#ff8000")).toEqual([255, 128, 0]);
    expect(parseColor("#000001")).toEqual([0, 0, 1]);
  });
});
