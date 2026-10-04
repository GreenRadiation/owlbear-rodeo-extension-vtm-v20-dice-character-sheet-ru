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
}

/**
 * A die succeeds when its value is at least the difficulty.
 * Every one cancels a success.
 * A ten is a single success: specialities, Willpower and the quirks of
 * damage rolls are left for the players to apply themselves.
 */
export function getRollOutcome(
  values: number[],
  difficulty: number
): RollOutcome {
  let hits = 0;
  let ones = 0;
  for (const value of values) {
    if (value === 1) {
      ones++;
    } else if (value >= difficulty) {
      hits++;
    }
  }
  return {
    successes: Math.max(0, hits - ones),
    botch: hits === 0 && ones > 0,
  };
}

/** Sort values for display: highest first, so tens lead and ones trail */
export function sortValues(values: number[]): number[] {
  return [...values].sort((a, b) => b - a);
}

export const TEN_SYMBOL = "☥";
export const ONE_SYMBOL = "☠";

/** A ten is shown as an ankh and a one as a skull */
export function formatValue(value: number): string {
  if (value === 10) {
    return TEN_SYMBOL;
  } else if (value === 1) {
    return ONE_SYMBOL;
  } else {
    return `${value}`;
  }
}

export function formatOutcome(outcome: RollOutcome): string {
  return outcome.botch ? ONE_SYMBOL : `${outcome.successes}`;
}
