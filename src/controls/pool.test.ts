import { describe, expect, it } from "vitest";

import {
  EMPTY_POOL,
  MAX_POOL,
  Pool,
  changePool,
  getPoolLabel,
  getPoolSize,
} from "./pool";

/** Add a few things to a pool in a row */
function build(...steps: [number, string?][]): Pool {
  return steps.reduce(
    (pool, [count, name]) => changePool(pool, count, name),
    EMPTY_POOL
  );
}

describe("changePool", () => {
  it("adds traits in order and plain dice at the end", () => {
    const pool = build([3, "Сила"], [2], [2, "Атлетика"], [1]);
    expect(pool).toEqual({
      parts: [
        { name: "Сила", dice: 3 },
        { name: "Атлетика", dice: 2 },
      ],
      extra: 3,
    });
    expect(getPoolSize(pool)).toBe(8);
    expect(getPoolLabel(pool)).toBe("Сила + Атлетика + 3d10");
  });

  it("takes plain dice away first, then breaks up the last trait", () => {
    let pool = build([3, "Сила"], [3, "Атлетика"], [2]);
    expect(getPoolLabel(pool)).toBe("Сила + Атлетика + 2d10");
    pool = changePool(pool, -1);
    expect(getPoolLabel(pool)).toBe("Сила + Атлетика + d10");
    pool = changePool(pool, -1);
    expect(getPoolLabel(pool)).toBe("Сила + Атлетика");
    // The last trait becomes plain dice, one of which is gone
    pool = changePool(pool, -1);
    expect(getPoolLabel(pool)).toBe("Сила + 2d10");
    expect(getPoolSize(pool)).toBe(5);
    pool = changePool(pool, -2);
    expect(getPoolLabel(pool)).toBe("Сила");
    pool = changePool(pool, -1);
    expect(getPoolLabel(pool)).toBe("2d10");
    pool = changePool(pool, -5);
    expect(pool).toEqual(EMPTY_POOL);
    expect(getPoolLabel(pool)).toBe("");
  });

  it("keeps the order the traits were added in", () => {
    expect(getPoolLabel(build([2, "Воровство"], [3, "Ловкость"]))).toBe(
      "Воровство + Ловкость"
    );
  });

  it("stops at the most dice a roll can have", () => {
    const pool = build([10, "Сила"], [10]);
    expect(getPoolSize(pool)).toBe(MAX_POOL);
    expect(pool.extra).toBe(6);
    // A trait that doesn't fit at all isn't added
    expect(changePool(pool, 1, "Атлетика")).toBe(pool);
  });

  it("does nothing for nothing", () => {
    expect(changePool(EMPTY_POOL, -3)).toEqual(EMPTY_POOL);
    expect(changePool(EMPTY_POOL, 0, "Сила")).toBe(EMPTY_POOL);
  });
});
