/**
 * Compact history of the rolls of a player.
 * Pure functions: no React, no Owlbear Rodeo SDK.
 *
 * The history is stored in the room metadata which is limited to 16 kB for
 * all the extensions of the room, so a roll is just the values of its dice:
 * one character per die, highest first, a ten is written as "0".
 * "0863" is a roll of 10, 8, 6 and 3.
 * The rolls are joined with "," from the oldest to the newest.
 */

import { sortValues } from "./roll";

/** How many rolls are kept for each player */
export const MAX_HISTORY_ROLLS = 20;

/** Encode the values (1-10) of a roll */
export function encodeRoll(values: number[]): string {
  return sortValues(values)
    .map((value) => (value === 10 ? "0" : `${value}`))
    .join("");
}

/** Decode a roll into its values (1-10), highest first */
export function decodeRoll(roll: string): number[] {
  const values: number[] = [];
  for (const char of roll) {
    const digit = Number.parseInt(char, 10);
    if (!Number.isNaN(digit)) {
      values.push(digit === 0 ? 10 : digit);
    }
  }
  return values;
}

/** Decode a history into its rolls, oldest first. Anything unexpected is ignored */
export function decodeHistory(history: unknown): number[][] {
  if (typeof history !== "string" || history === "") {
    return [];
  }
  return history
    .split(",")
    .map(decodeRoll)
    .filter((values) => values.length > 0);
}

/** Add a roll to the end of a history dropping the oldest rolls over the limit */
export function pushRoll(
  history: unknown,
  values: number[],
  maxRolls = MAX_HISTORY_ROLLS
): string {
  const rolls = typeof history === "string" && history ? history.split(",") : [];
  rolls.push(encodeRoll(values));
  return rolls.slice(-Math.max(1, maxRolls)).join(",");
}
