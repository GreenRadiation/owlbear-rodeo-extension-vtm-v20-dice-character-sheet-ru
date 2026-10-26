import { describe, expect, it } from "vitest";

import {
  MAX_HISTORY_ROLLS,
  MAX_LABEL_PART_LENGTH,
  ROLL_NAMES,
  decodeLabel,
  encodeLabel,
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
    expect(decodeRoll("0863")).toEqual({ values: [10, 8, 6, 3] });
    expect(decodeRoll(encodeRoll([5, 1, 10, 9]))).toEqual({
      values: [10, 9, 5, 1],
    });
  });

  it("uses one character per die", () => {
    expect(encodeRoll(Array(16).fill(10))).toHaveLength(16);
  });

  it("keeps what was rolled after the values, by index", () => {
    const roll = encodeRoll([7, 3], "Сила + Атлетика + 2d10");
    expect(roll).toBe("73|0+9+x2");
    expect(decodeRoll(roll)).toEqual({
      values: [7, 3],
      label: "Сила + Атлетика + 2d10",
    });
    expect(encodeRoll([7, 3], "")).toBe("73");
    expect(encodeRoll([7, 3], "   ")).toBe("73");
  });

  it("knows everything of the sheet that can be rolled", () => {
    expect(ROLL_NAMES.indexOf("Сила")).toBe(0);
    expect(ROLL_NAMES).toContain("Атлетика");
    expect(ROLL_NAMES).toContain("Смелость");
    expect(ROLL_NAMES).toContain("Воля");
    expect(ROLL_NAMES).toContain("Человечность");
    expect(ROLL_NAMES).toContain("Анимализм");
    expect(ROLL_NAMES).toContain("Путь Смерти и Души");
    // Every name is found back by its index
    for (const name of ROLL_NAMES) {
      expect(decodeLabel(encodeLabel(name))).toBe(name);
    }
    expect(new Set(ROLL_NAMES).size).toBe(ROLL_NAMES.length);
  });

  it("writes a trait the player typed in as text", () => {
    expect(encodeLabel("Кунг-фу + d10")).toBe("~Кунг-фу+x1");
    expect(decodeLabel("~Кунг-фу+x1")).toBe("Кунг-фу + d10");
    // Text that looks like a code is still text
    expect(decodeLabel(encodeLabel("12 + x2"))).toBe("12 + x2");
  });

  it("keeps the separators out of the text and the text short", () => {
    expect(decodeRoll(encodeRoll([5], "a,b|c+d~e"))).toEqual({
      values: [5],
      label: "a b c d e",
    });
    const long = encodeRoll([5], "ы".repeat(200));
    expect(decodeRoll(long).label).toHaveLength(MAX_LABEL_PART_LENGTH);
  });

  it("drops what it doesn't know", () => {
    expect(decodeLabel("99999+0+?+x0")).toBe("Сила");
  });
});

describe("history", () => {
  it("starts from nothing", () => {
    expect(pushRoll(undefined, [7, 2])).toBe("72");
    expect(pushRoll("", [7, 2])).toBe("72");
  });

  it("adds the newest roll to the end", () => {
    expect(pushRoll("72", [10, 4])).toBe("72,04");
    expect(pushRoll("72", [10, 4], "Сила")).toBe("72,04|0");
  });

  it("drops the oldest rolls over the limit", () => {
    let history = "";
    for (let i = 0; i < MAX_HISTORY_ROLLS + 5; i++) {
      history = pushRoll(history, [(i % 9) + 1]);
    }
    const rolls = decodeHistory(history);
    expect(rolls).toHaveLength(MAX_HISTORY_ROLLS);
    // The first five rolls are gone
    expect(rolls[0].values).toEqual([6]);
    expect(pushRoll("1,2,3", [4], undefined, 2)).toBe("3,4");
  });

  it("decodes the rolls oldest first", () => {
    expect(decodeHistory("72,04|0")).toEqual([
      { values: [7, 2] },
      { values: [10, 4], label: "Сила" },
    ]);
  });

  it("ignores anything unexpected", () => {
    expect(decodeHistory(undefined)).toEqual([]);
    expect(decodeHistory(42)).toEqual([]);
    expect(decodeHistory("7x2,,|0")).toEqual([{ values: [7, 2] }]);
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
