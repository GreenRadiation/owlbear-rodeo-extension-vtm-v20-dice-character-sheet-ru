/**
 * What a pool of dice is made of. Pure functions, no store.
 *
 * A pool is the traits of the sheet in the order they were added, plus the
 * dice added by hand, which always come last: "Сила + Атлетика + 2d10".
 */

/** The most dice that can be rolled at once */
export const MAX_POOL = 16;

/** A trait of the sheet in the pool */
export interface PoolPart {
  name: string;
  dice: number;
}

export interface Pool {
  parts: PoolPart[];
  /** Dice added by hand, on top of the traits */
  extra: number;
}

export const EMPTY_POOL: Pool = { parts: [], extra: 0 };

export function getPoolSize(pool: Pool): number {
  return pool.parts.reduce((sum, part) => sum + part.dice, 0) + pool.extra;
}

/**
 * Add dice to a pool, or take them away with a count below zero.
 * With a name the dice are a trait of the sheet. Taking dice away starts
 * with the ones added by hand; when they are gone the last trait is broken
 * up into plain dice, one of which goes.
 */
export function changePool(pool: Pool, count: number, name?: string): Pool {
  if (count === 0) {
    return pool;
  }
  if (count > 0) {
    const added = Math.min(count, MAX_POOL - getPoolSize(pool));
    if (added <= 0) {
      return pool;
    }
    return name
      ? { ...pool, parts: [...pool.parts, { name, dice: added }] }
      : { ...pool, extra: pool.extra + added };
  }
  if (getPoolSize(pool) === 0) {
    return pool;
  }
  let parts = pool.parts;
  let extra = pool.extra;
  let left = -count;
  while (left > 0) {
    if (extra > 0) {
      const taken = Math.min(extra, left);
      extra -= taken;
      left -= taken;
    } else if (parts.length > 0) {
      const last = parts[parts.length - 1];
      parts = parts.slice(0, -1);
      extra = last.dice - 1;
      left -= 1;
    } else {
      break;
    }
  }
  return { parts, extra };
}

/** What the pool is made of, for the player to see what they are rolling */
export function getPoolLabel(pool: Pool): string {
  const names = pool.parts.map((part) => part.name);
  if (pool.extra > 0) {
    names.push(pool.extra > 1 ? `${pool.extra}d10` : "d10");
  }
  return names.join(" + ");
}
