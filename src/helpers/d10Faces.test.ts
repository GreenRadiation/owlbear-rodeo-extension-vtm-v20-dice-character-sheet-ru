import { describe, expect, it } from "vitest";

import {
  faceNumbers,
  getD10Flatness,
  getD10Value,
  isD10Cocked,
} from "./d10Faces";

/** Quaternion for a rotation around an axis, the axis must be normalized */
function axisAngle(x: number, y: number, z: number, degrees: number) {
  const half = (degrees * Math.PI) / 360;
  const s = Math.sin(half);
  return { x: x * s, y: y * s, z: z * s, w: Math.cos(half) };
}

describe("d10 faces", () => {
  it("is cocked when standing on its tip", () => {
    // In its rest pose the die stands on an apex with every face leaning
    const identity = { x: 0, y: 0, z: 0, w: 1 };
    expect(getD10Flatness(identity)).toBeLessThan(0.9);
    expect(isD10Cocked(identity)).toBe(true);
  });

  it("finds a rotation that lays a face flat", () => {
    // Tilting the die around X sweeps a face through horizontal
    let best = -1;
    let bestDegrees = 0;
    for (let degrees = 0; degrees < 360; degrees += 0.05) {
      const flatness = getD10Flatness(axisAngle(1, 0, 0, degrees));
      if (flatness > best) {
        best = flatness;
        bestDegrees = degrees;
      }
    }
    expect(best).toBeGreaterThan(0.99999);
    expect(isD10Cocked(axisAngle(1, 0, 0, bestDegrees))).toBe(false);
    // A small lean is fine, a big one is not
    expect(isD10Cocked(axisAngle(1, 0, 0, bestDegrees + 8))).toBe(false);
    expect(isD10Cocked(axisAngle(1, 0, 0, bestDegrees + 16))).toBe(true);
  });

  it("has every number on exactly one face", () => {
    expect([...faceNumbers].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("reads the number that is up", () => {
    // Locator 2 points to +Z and a bit up: tilting the die around X brings it to the top
    const seen = new Set<number>();
    for (let degrees = 0; degrees < 360; degrees += 1) {
      seen.add(getD10Value(axisAngle(1, 0, 0, degrees)));
    }
    expect(seen.has(2)).toBe(true);
    // Its opposite face, the 7, is up after half a turn more
    expect(seen.has(7)).toBe(true);
    // Turning the die around the vertical axis doesn't change what is up
    const tilt = axisAngle(1, 0, 0, 50);
    const value = getD10Value(tilt);
    for (let degrees = 0; degrees < 360; degrees += 30) {
      const spin = axisAngle(0, 1, 0, degrees);
      expect(
        getD10Value({
          x: spin.w * tilt.x,
          y: spin.y * tilt.w,
          z: -spin.y * tilt.x,
          w: spin.w * tilt.w,
        })
      ).toBe(value);
    }
  });

  it("doesn't depend on how the die is turned around the vertical axis", () => {
    const tilt = axisAngle(1, 0, 0, 40);
    const spin = axisAngle(0, 1, 0, 123);
    // spin * tilt
    const combined = {
      x: spin.w * tilt.x + spin.y * tilt.z,
      y: spin.y * tilt.w,
      z: spin.w * tilt.z - spin.y * tilt.x,
      w: spin.w * tilt.w,
    };
    expect(getD10Flatness(combined)).toBeCloseTo(getD10Flatness(tilt), 10);
  });
});
