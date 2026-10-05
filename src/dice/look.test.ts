import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOOK,
  FINISH_PRESETS,
  PATTERNS,
  SECOND_LOOK,
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
      ...SECOND_LOOK,
      body: "#102030",
      pattern: "walnut",
      digits2: "#00ff00",
      outline: "#000000",
      engraving: -0.75,
      digitsCoated: false,
      tenIcon: "",
      oneIcon: "star",
      transmission: 1,
      iridescenceHue: 0.05,
    };
    expect(sanitizeLook(look, ICONS)).toEqual(look);
  });

  it("fills what is missing from the look it is given", () => {
    expect(sanitizeLook({ body: "#000000" }, ICONS, SECOND_LOOK)).toEqual({
      ...SECOND_LOOK,
      body: "#000000",
    });
  });

  it("reads the looks of the first version with a named finish", () => {
    const old = sanitizeLook(
      { finish: "glass", roughness: 0.6, body: "#00ff00" },
      ICONS
    );
    expect(old.transmission).toBe(1);
    expect(old.clearcoat).toBe(FINISH_PRESETS.glass.clearcoat);
    // What the player had changed after picking the finish stays
    expect(old.roughness).toBe(0.6);
    // A look of this version isn't touched by a stray finish
    expect(
      sanitizeLook({ finish: "glass", clearcoat: 0.3 }, ICONS).transmission
    ).toBe(DEFAULT_LOOK.transmission);
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
        engraving: -5,
        digitsCoated: "yes",
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
    expect(look.engraving).toBe(-1);
    expect(look.digitsCoated).toBe(DEFAULT_LOOK.digitsCoated);
    expect(look.roughness).toBe(DEFAULT_LOOK.roughness);
    expect(look.metalness).toBe(DEFAULT_LOOK.metalness);
  });

  it("only keeps a font it has", () => {
    const assets = { icons: ICONS, fonts: ["gothic"] };
    expect(sanitizeLook({ font: "gothic" }, assets).font).toBe("gothic");
    expect(sanitizeLook({ font: "comic" }, assets).font).toBe("");
    expect(sanitizeLook({ font: "gothic" }, ICONS).font).toBe("");
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
