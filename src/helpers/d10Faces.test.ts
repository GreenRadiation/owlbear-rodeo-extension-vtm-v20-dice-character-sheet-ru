import { describe, expect, it } from "vitest";

import { getD10Flatness, isD10Cocked } from "./d10Faces";

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
    expect(isD10Cocked(axisAngle(1, 0, 0, bestDegrees + 2))).toBe(false);
    expect(isD10Cocked(axisAngle(1, 0, 0, bestDegrees + 6))).toBe(true);
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
