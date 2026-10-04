import { describe, expect, it } from "vitest";

import {
  MAX_HISTORY_ROLLS,
  decodeHistory,
  decodeRoll,
  encodeRoll,
  pushRoll,
} from "./history";

describe("roll encoding", () => {
  it("writes the highest dice first and a ten as 0", () => {
    expect(encodeRoll([3, 10, 8, 6])).toBe("0863");
    expect(encodeRoll([1, 10, 1, 10])).toBe("0011");
  });

  it("reads a roll back", () => {
    expect(decodeRoll("0863")).toEqual([10, 8, 6, 3]);
    expect(decodeRoll(encodeRoll([5, 1, 10, 9]))).toEqual([10, 9, 5, 1]);
  });

  it("uses one character per die", () => {
    expect(encodeRoll(Array(16).fill(10))).toHaveLength(16);
  });
});

describe("history", () => {
  it("starts from nothing", () => {
    expect(pushRoll(undefined, [7, 2])).toBe("72");
    expect(pushRoll("", [7, 2])).toBe("72");
  });

  it("adds the newest roll to the end", () => {
    expect(pushRoll("72", [10, 4])).toBe("72,04");
  });

  it("drops the oldest rolls over the limit", () => {
    let history = "";
    for (let i = 0; i < MAX_HISTORY_ROLLS + 5; i++) {
      history = pushRoll(history, [(i % 9) + 1]);
    }
    const rolls = decodeHistory(history);
    expect(rolls).toHaveLength(MAX_HISTORY_ROLLS);
    // The first five rolls are gone
    expect(rolls[0]).toEqual([6]);
    expect(pushRoll("1,2,3", [4], 2)).toBe("3,4");
  });

  it("decodes the rolls oldest first", () => {
    expect(decodeHistory("72,04")).toEqual([
      [7, 2],
      [10, 4],
    ]);
  });

  it("ignores anything unexpected", () => {
    expect(decodeHistory(undefined)).toEqual([]);
    expect(decodeHistory(42)).toEqual([]);
    expect(decodeHistory("7x2,,")).toEqual([[7, 2]]);
  });

  it("stays small enough for the room metadata", () => {
    let history = "";
    for (let i = 0; i < MAX_HISTORY_ROLLS; i++) {
      history = pushRoll(history, Array(16).fill(10));
    }
    // 20 rolls of 16 dice plus the separators
    expect(history.length).toBe(20 * 16 + 19);
  });
});
