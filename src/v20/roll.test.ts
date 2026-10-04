import { describe, expect, it } from "vitest";

import {
  clampDifficulty,
  faceToValue,
  formatOutcome,
  formatValue,
  getRollOutcome,
  sortValues,
} from "./roll";

describe("faceToValue", () => {
  it("reads the 0 face as a ten", () => {
    expect(faceToValue(0)).toBe(10);
  });
  it("keeps the other faces", () => {
    expect([1, 5, 9].map(faceToValue)).toEqual([1, 5, 9]);
  });
});

describe("getRollOutcome", () => {
  it("counts dice at or above the difficulty", () => {
    expect(getRollOutcome([6, 7, 5, 10, 2], 6)).toEqual({
      successes: 3,
      botch: false,
    });
  });

  it("cancels a success for every one", () => {
    expect(getRollOutcome([8, 9, 1, 3], 6)).toEqual({
      successes: 1,
      botch: false,
    });
  });

  it("is a plain failure when ones cancel every success", () => {
    expect(getRollOutcome([8, 1, 1, 4], 6)).toEqual({
      successes: 0,
      botch: false,
    });
  });

  it("is a plain failure with no successes and no ones", () => {
    expect(getRollOutcome([2, 3, 5], 6)).toEqual({
      successes: 0,
      botch: false,
    });
  });

  it("is a botch with no successes and a one", () => {
    expect(getRollOutcome([1, 3, 5], 6)).toEqual({
      successes: 0,
      botch: true,
    });
  });

  it("counts a ten as a single success", () => {
    expect(getRollOutcome([10, 10], 6)).toEqual({
      successes: 2,
      botch: false,
    });
  });

  it("depends on the difficulty", () => {
    const values = [1, 4, 7, 9];
    // 4, 7 and 9 succeed, the one cancels a success
    expect(getRollOutcome(values, 4).successes).toBe(2);
    // Only the 9 succeeds and is cancelled: a failure but not a botch
    expect(getRollOutcome(values, 8)).toEqual({ successes: 0, botch: false });
    // Nothing succeeds and there is a one
    expect(getRollOutcome(values, 10)).toEqual({ successes: 0, botch: true });
  });

  it("handles the difficulty bounds", () => {
    expect(getRollOutcome([2, 2, 2], 2).successes).toBe(3);
    expect(getRollOutcome([9, 9, 10], 10).successes).toBe(1);
  });

  it("handles an empty roll", () => {
    expect(getRollOutcome([], 6)).toEqual({ successes: 0, botch: false });
  });
});

describe("display", () => {
  it("sorts the highest values first without changing the input", () => {
    const values = [3, 10, 1, 8];
    expect(sortValues(values)).toEqual([10, 8, 3, 1]);
    expect(values).toEqual([3, 10, 1, 8]);
  });

  it("shows tens and ones as symbols", () => {
    expect([10, 8, 1].map(formatValue)).toEqual(["☥", "8", "☠"]);
  });

  it("shows a botch as a skull and anything else as a number", () => {
    expect(formatOutcome({ successes: 0, botch: true })).toBe("☠");
    expect(formatOutcome({ successes: 0, botch: false })).toBe("0");
    expect(formatOutcome({ successes: 4, botch: false })).toBe("4");
  });

  it("clamps the difficulty to 2-10", () => {
    expect([1, 2, 6, 10, 11].map(clampDifficulty)).toEqual([2, 2, 6, 10, 10]);
  });
});
