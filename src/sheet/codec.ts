/**
 * Compact encoding of a character sheet for the room metadata.
 * Pure functions: no React, no Owlbear Rodeo SDK.
 *
 * A room only has 16000 bytes for all its extensions and Cyrillic text takes
 * two bytes a character, so a sheet is stored as a JSON array without keys:
 * dots are strings of digits and names picked from the dropdowns are stored
 * as their index in the list (see lists.ts) instead of text.
 */

import {
  ARCHETYPES,
  BACKGROUNDS,
  CLANS,
  DISCIPLINES,
  FLAWS,
  MERITS,
  PATHS,
} from "./lists";
import {
  ABILITY_KEYS,
  ATTRIBUTE_KEYS,
  NamedTrait,
  PHYSICAL_KEYS,
  Sheet,
  TRAIT_KEYS,
  VIRTUE_KEYS,
  sanitizeSheet,
} from "./model";

/** Bump when the layout of the array changes and keep reading the old layouts */
const VERSION = 1;

/** A name from a list as its index or any other text as it is */
type Ref = number | string;

function toRef(name: string, names: string[]): Ref {
  const index = names.indexOf(name);
  return index === -1 ? name : index;
}

function fromRef(ref: unknown, names: string[]): string {
  if (typeof ref === "number") {
    return names[ref] || "";
  }
  return typeof ref === "string" ? ref : "";
}

/** Values from 0 to 9 as a string of digits */
function toDigits(values: number[]): string {
  return values.map((value) => Math.min(9, Math.max(0, value))).join("");
}

function fromDigits(digits: unknown): number[] {
  return typeof digits === "string"
    ? [...digits].map((digit) => Number.parseInt(digit, 10) || 0)
    : [];
}

function toTraits(traits: NamedTrait[], names: string[]): (Ref | number)[] {
  return traits.flatMap((trait) => [toRef(trait.name, names), trait.value]);
}

function fromTraits(flat: unknown, names: string[]): NamedTrait[] {
  const traits: NamedTrait[] = [];
  if (Array.isArray(flat)) {
    for (let i = 0; i + 1 < flat.length; i += 2) {
      traits.push({ name: fromRef(flat[i], names), value: flat[i + 1] });
    }
  }
  return traits;
}

function fromRefs(refs: unknown, names: string[]): string[] {
  return Array.isArray(refs) ? refs.map((ref) => fromRef(ref, names)) : [];
}

function byKeys<K extends string>(keys: readonly K[], values: number[]) {
  const result = {} as Record<K, number>;
  keys.forEach((key, index) => {
    result[key] = values[index];
  });
  return result;
}

export function encodeSheet(sheet: Sheet): string {
  const specialties: (number | string)[] = [];
  TRAIT_KEYS.forEach((key, index) => {
    const specialty = sheet.specialties[key];
    if (specialty) {
      specialties.push(index, specialty);
    }
  });

  return JSON.stringify([
    VERSION,
    sheet.name,
    toRef(sheet.nature, ARCHETYPES),
    sheet.age,
    toRef(sheet.clan, CLANS),
    sheet.generation,
    toDigits(ATTRIBUTE_KEYS.map((key) => sheet.attributes[key])),
    toDigits(ABILITY_KEYS.map((key) => sheet.abilities[key])),
    toDigits(VIRTUE_KEYS.map((key) => sheet.virtues[key])),
    sheet.humanity,
    toRef(sheet.path, PATHS),
    sheet.willpower,
    sheet.willpowerPool,
    sheet.bloodPool,
    toDigits(sheet.health),
    toDigits(PHYSICAL_KEYS.map((key) => sheet.bloodDots[key])),
    sheet.locked ? 1 : 0,
    toTraits(sheet.disciplines, DISCIPLINES),
    toTraits(sheet.backgrounds, BACKGROUNDS),
    sheet.merits.map((merit) => toRef(merit, MERITS)),
    sheet.flaws.map((flaw) => toRef(flaw, FLAWS)),
    sheet.experience,
    specialties,
  ]);
}

/** Decode a stored sheet, null if there is no sheet or it can't be read */
export function decodeSheet(encoded: unknown): Sheet | null {
  if (typeof encoded !== "string" || encoded === "") {
    return null;
  }
  let data: unknown;
  try {
    data = JSON.parse(encoded);
  } catch {
    return null;
  }
  if (!Array.isArray(data) || data[0] !== VERSION) {
    return null;
  }

  const specialties: Record<string, unknown> = {};
  const flat = Array.isArray(data[22]) ? data[22] : [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const key = TRAIT_KEYS[flat[i]];
    if (key) {
      specialties[key] = flat[i + 1];
    }
  }

  // Sanitizing takes care of everything that is missing or out of range
  return sanitizeSheet({
    name: data[1],
    nature: fromRef(data[2], ARCHETYPES),
    age: data[3],
    clan: fromRef(data[4], CLANS),
    generation: data[5],
    attributes: byKeys(ATTRIBUTE_KEYS, fromDigits(data[6])),
    abilities: byKeys(ABILITY_KEYS, fromDigits(data[7])),
    virtues: byKeys(VIRTUE_KEYS, fromDigits(data[8])),
    humanity: data[9],
    path: fromRef(data[10], PATHS),
    willpower: data[11],
    willpowerPool: data[12],
    bloodPool: data[13],
    health: fromDigits(data[14]),
    bloodDots: byKeys(PHYSICAL_KEYS, fromDigits(data[15])),
    locked: data[16] === 1,
    disciplines: fromTraits(data[17], DISCIPLINES),
    backgrounds: fromTraits(data[18], BACKGROUNDS),
    merits: fromRefs(data[19], MERITS),
    flaws: fromRefs(data[20], FLAWS),
    experience: data[21],
    specialties,
  });
}
