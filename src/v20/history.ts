/**
 * Compact history of the rolls of a player.
 * Pure functions: no React, no Owlbear Rodeo SDK.
 *
 * The history is stored in the room metadata which is limited to 16 kB for
 * all the extensions of the room, so a roll is just the values of its dice:
 * one character per die, highest first, a ten is written as "0".
 * "0863" is a roll of 10, 8, 6 and 3. What was rolled may follow after "|":
 * "0863|Сила + Атлетика + 2d10". The rolls are joined with "," from the
 * oldest to the newest.
 */

import { sortValues } from "./roll";

/** How many rolls are kept for each player */
export const MAX_HISTORY_ROLLS = 20;

/** Longest label kept with a roll, the room is small */
export const MAX_LABEL_LENGTH = 80;

const LABEL_SEPARATOR = "|";
const ROLL_SEPARATOR = ",";

/** A roll of the history */
export interface HistoryRoll {
  /** Values (1-10), highest first */
  values: number[];
  /** What was rolled: "Сила + Атлетика + 2d10", older rolls have none */
  label?: string;
}

/** Encode the values (1-10) of a roll and what was rolled, if known */
export function encodeRoll(values: number[], label?: string): string {
  const digits = sortValues(values)
    .map((value) => (value === 10 ? "0" : `${value}`))
    .join("");
  // The separators can't be part of the label
  const clean = (label || "")
    .replace(/[|,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LABEL_LENGTH);
  return clean ? `${digits}${LABEL_SEPARATOR}${clean}` : digits;
}

/** Decode a roll into its values (1-10), highest first, and its label */
export function decodeRoll(roll: string): HistoryRoll {
  const separator = roll.indexOf(LABEL_SEPARATOR);
  const digits = separator < 0 ? roll : roll.slice(0, separator);
  const label = separator < 0 ? "" : roll.slice(separator + 1).trim();
  const values: number[] = [];
  for (const char of digits) {
    const digit = Number.parseInt(char, 10);
    if (!Number.isNaN(digit)) {
      values.push(digit === 0 ? 10 : digit);
    }
  }
  return label ? { values, label } : { values };
}

/** Decode a history into its rolls, oldest first. Anything unexpected is ignored */
export function decodeHistory(history: unknown): HistoryRoll[] {
  if (typeof history !== "string" || history === "") {
    return [];
  }
  return history
    .split(ROLL_SEPARATOR)
    .map(decodeRoll)
    .filter((roll) => roll.values.length > 0);
}

/** Add a roll to the end of a history dropping the oldest rolls over the limit */
export function pushRoll(
  history: unknown,
  values: number[],
  label?: string,
  maxRolls = MAX_HISTORY_ROLLS
): string {
  const rolls =
    typeof history === "string" && history ? history.split(ROLL_SEPARATOR) : [];
  rolls.push(encodeRoll(values, label));
  return rolls.slice(-Math.max(1, maxRolls)).join(ROLL_SEPARATOR);
}
