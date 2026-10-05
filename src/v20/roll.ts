/**
 * Rules of a Vampire: The Masquerade V20 dice pool roll.
 * Pure functions: no React, no Owlbear Rodeo SDK.
 *
 * All values here are in the 1-10 range, use `faceToValue` to convert
 * from the face of a physical D10 where the ten is printed as "0".
 */

export const DEFAULT_DIFFICULTY = 6;
export const MIN_DIFFICULTY = 2;
export const MAX_DIFFICULTY = 10;

/** Convert the face of a D10 (0-9) into its value (1-10) */
export function faceToValue(face: number): number {
  return face === 0 ? 10 : face;
}

export function clampDifficulty(difficulty: number): number {
  return Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, difficulty));
}

export interface RollOutcome {
  /** Successes left after the ones have cancelled theirs, never below zero */
  successes: number;
  /** No die rolled a success and at least one die rolled a one */
  botch: boolean;
  /** How many dice rolled a one */
  ones: number;
}

/**
 * A die succeeds when its value is at least the difficulty.
 * Every one cancels a success.
 * With a speciality every ten counts as two successes.
 * Willpower and the quirks of damage rolls are left for the players
 * to apply themselves.
 */
export function getRollOutcome(
  values: number[],
  difficulty: number,
  specialty = false
): RollOutcome {
  let hits = 0;
  let ones = 0;
  for (const value of values) {
    if (value === 1) {
      ones++;
    } else if (value >= difficulty) {
      hits += specialty && value === 10 ? 2 : 1;
    }
  }
  return {
    successes: Math.max(0, hits - ones),
    botch: hits === 0 && ones > 0,
    ones,
  };
}

/** Sort values for display: highest first, so tens lead and ones trail */
export function sortValues(values: number[]): number[] {
  return [...values].sort((a, b) => b - a);
}

/** How the two special values of a die are written */
export interface Symbols {
  ten: string;
  /** Also stands for a botch */
  one: string;
}

/**
 * The choices for the symbols, the first ones are the default.
 * U+FE0E asks for the plain text shape of a character that also has an emoji:
 * the emoji shapes are wider and colored.
 */
export const TEN_SYMBOLS = ["☥", "✦", "★", "✪", "0", "10"];
export const ONE_SYMBOLS = ["☠\uFE0E", "💀", "✝\uFE0E", "†", "✖\uFE0E", "1"];

/** A ten is an ankh and a one is a skull unless the player picks something else */
export const DEFAULT_SYMBOLS: Symbols = {
  ten: TEN_SYMBOLS[0],
  one: ONE_SYMBOLS[0],
};

export function formatValue(value: number, symbols = DEFAULT_SYMBOLS): string {
  if (value === 10) {
    return symbols.ten;
  } else if (value === 1) {
    return symbols.one;
  } else {
    return `${value}`;
  }
}

export function formatOutcome(
  outcome: RollOutcome,
  symbols = DEFAULT_SYMBOLS
): string {
  if (!outcome.botch) {
    return `${outcome.successes}`;
  }
  // A botch written with a digit would look like a number of successes
  return /^\d+$/.test(symbols.one) ? `\u2212${outcome.ones}` : symbols.one;
}
