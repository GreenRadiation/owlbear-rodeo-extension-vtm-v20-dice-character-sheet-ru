/**
 * Compact history of the rolls of a player.
 * Pure functions: no React, no Owlbear Rodeo SDK.
 *
 * The history is stored in the room metadata which is limited to 16 kB for
 * all the extensions of the room, so a roll is just the values of its dice:
 * one character per die, highest first, a ten is written as "0".
 * "0863" is a roll of 10, 8, 6 and 3. What was rolled may follow after "|",
 * as the parts of the pool joined with "+": a trait of the sheet is its
 * index in `ROLL_NAMES`, the dice added by hand are "x" and their count,
 * anything else (a trait the player typed in) is the text after "~".
 * "0863|0+9+x2" is 10, 8, 6, 3 rolled for "Сила + Атлетика + 2d10".
 * The rolls are joined with "," from the oldest to the newest.
 */

import { sortValues } from "./roll";
import {
  TRAIT_KEYS,
  TRAIT_NAMES,
  VIRTUE_KEYS,
  VIRTUE_NAMES,
} from "../sheet/model";
import { BACKGROUNDS, DISCIPLINES, PATHS } from "../sheet/lists";

/** How many rolls are kept for each player */
export const MAX_HISTORY_ROLLS = 20;

/** Longest text of a part of a label that isn't in `ROLL_NAMES` */
export const MAX_LABEL_PART_LENGTH = 40;

/**
 * Everything of the sheet that can be rolled, by index. The history in the
 * room refers to these by index, so names can only be added at the end.
 */
export const ROLL_NAMES: string[] = [
  ...TRAIT_KEYS.map((key) => TRAIT_NAMES[key]),
  ...VIRTUE_KEYS.map((key) => VIRTUE_NAMES[key]),
  "Воля",
  "Человечность",
  ...DISCIPLINES,
  ...BACKGROUNDS,
  ...PATHS,
];

const ROLL_INDICES = new Map(ROLL_NAMES.map((name, index) => [name, index]));

const LABEL_SEPARATOR = "|";
const ROLL_SEPARATOR = ",";
const PART_SEPARATOR = "+";
const TEXT_MARK = "~";
const EXTRA_MARK = "x";
/** How the parts of a label are joined in the interface, see `getPoolLabel` */
const LABEL_JOIN = " + ";

/** A roll of the history */
export interface HistoryRoll {
  /** Values (1-10), highest first */
  values: number[];
  /** What was rolled: "Сила + Атлетика + 2d10", older rolls have none */
  label?: string;
}

/** Encode one part of a label: "Сила" → "0", "2d10" → "x2", "Кунг-фу" → "~Кунг-фу" */
function encodePart(part: string): string {
  const index = ROLL_INDICES.get(part);
  if (index !== undefined) {
    return `${index}`;
  }
  const extra = /^(\d*)d10$/.exec(part);
  if (extra) {
    return `${EXTRA_MARK}${extra[1] || 1}`;
  }
  // The separators can't be part of the text
  const text = part
    .replace(/[|,+~]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LABEL_PART_LENGTH);
  return text ? `${TEXT_MARK}${text}` : "";
}

function decodePart(part: string): string {
  if (/^\d+$/.test(part)) {
    return ROLL_NAMES[Number.parseInt(part, 10)] || "";
  }
  if (part.startsWith(EXTRA_MARK)) {
    const count = Number.parseInt(part.slice(1), 10);
    if (Number.isNaN(count) || count < 1) {
      return "";
    }
    return count > 1 ? `${count}d10` : "d10";
  }
  if (part.startsWith(TEXT_MARK)) {
    return part.slice(1).trim();
  }
  return "";
}

/** Encode what was rolled for the room, see the header of this file */
export function encodeLabel(label: string): string {
  return label
    .split(LABEL_JOIN)
    .map((part) => encodePart(part.trim()))
    .filter((part) => part !== "")
    .join(PART_SEPARATOR);
}

/** The label back from the room, unknown parts are dropped */
export function decodeLabel(encoded: string): string {
  return encoded
    .split(PART_SEPARATOR)
    .map(decodePart)
    .filter((part) => part !== "")
    .join(LABEL_JOIN);
}

/** Encode the values (1-10) of a roll and what was rolled, if known */
export function encodeRoll(values: number[], label?: string): string {
  const digits = sortValues(values)
    .map((value) => (value === 10 ? "0" : `${value}`))
    .join("");
  const encoded = label ? encodeLabel(label) : "";
  return encoded ? `${digits}${LABEL_SEPARATOR}${encoded}` : digits;
}

/** Decode a roll into its values (1-10), highest first, and its label */
export function decodeRoll(roll: string): HistoryRoll {
  const separator = roll.indexOf(LABEL_SEPARATOR);
  const digits = separator < 0 ? roll : roll.slice(0, separator);
  const label = separator < 0 ? "" : decodeLabel(roll.slice(separator + 1));
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
