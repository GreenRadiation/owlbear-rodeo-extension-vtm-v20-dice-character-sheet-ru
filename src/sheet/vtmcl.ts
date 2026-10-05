/**
 * Import and export of character sheets in the format of the character sheet
 * by NtsDK (https://trechkalov.com/vtm/current/, https://github.com/NtsDK/vtmcl)
 * that the group fills in outside of the game.
 * Pure functions: no React, no Owlbear Rodeo SDK.
 */

import {
  ABILITY_KEYS,
  ATTRIBUTE_KEYS,
  HEALTH_LEVELS,
  Sheet,
  VIRTUE_KEYS,
  sanitizeSheet,
} from "./model";

/** Version of the format that is written, the site only loads files of its current version */
const VTMCL_VERSION = "0.7.0";

/** Keys of the health levels in the file from the lightest to the heaviest, same order as HEALTH_LEVELS */
const HEALTH_KEYS = [
  "bruised",
  "hurt",
  "injured",
  "wounded",
  "mauled",
  "crippled",
  "incapacitated",
] as const;

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

export interface VtmclImport {
  sheet: Sheet;
  /** The notes of the file, they are kept apart from the sheet */
  notes: string;
}

/**
 * Read a sheet from the contents of a file saved by the site.
 * Returns null if the file doesn't look like a sheet at all,
 * otherwise reads what it can: files of other versions are fine.
 */
export function importVtmcl(json: string): VtmclImport | null {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  const root = record(data);
  const source = record(root.Charsheet ?? root.charsheet ?? data);
  if (!("attributes" in source) || !("abilities" in source)) {
    return null;
  }

  const profile = record(source.profile);
  const state = record(source.state);
  const health = record(source.health);

  const sheet = sanitizeSheet({
    name: profile.name,
    nature: profile.nature,
    age: profile.age,
    clan: profile.clan,
    // Written as "8-е" or "8th", an empty generation becomes the default one
    generation: profile.generation,
    attributes: source.attributes,
    abilities: source.abilities,
    disciplines: source.disciplines,
    backgrounds: source.backgrounds,
    virtues: source.virtues,
    humanity: state.humanity,
    path: state.pathName,
    willpower: state.willpowerRating,
    willpowerPool: state.willpowerPool,
    bloodPool: state.bloodpool,
    health: HEALTH_KEYS.map((key) => health[key]),
    merits: source.merits,
    flaws: source.flaws,
    experience: state.experience,
  });

  return {
    sheet,
    notes: typeof source.notes === "string" ? source.notes : "",
  };
}

/**
 * An empty sheet exactly as the site writes it.
 * The site checks every field of a file it loads so all of them have to be there.
 */
function createVtmclSheet() {
  const zeros = (keys: string[]) =>
    Object.fromEntries(keys.map((key) => [key, 0]));
  return {
    preset: "vampire_v20",
    profile: {
      name: "",
      player: "",
      chronicle: "",
      nature: "",
      age: "",
      sex: "",
      demeanor: "",
      concept: "",
      clan: "",
      generation: "",
      sire: "",
      court: "",
      house: "",
      kith: "",
      primaryLegacy: "",
      secondaryLegacy: "",
      motley: "",
      seeming: "",
      residence: "",
      essence: "",
      affiliation: "",
      sect: "",
    },
    abilities: zeros([
      "alertness",
      "athletics",
      "brawl",
      "empathy",
      "expression",
      "intimidation",
      "leadership",
      "streetwise",
      "subterfuge",
      "awareness",
      "animalken",
      "crafts",
      "drive",
      "etiquette",
      "firearms",
      "melee",
      "performance",
      "stealth",
      "survival",
      "larceny",
      "academics",
      "computer",
      "finance",
      "investigation",
      "law",
      "medicine",
      "occult",
      "politics",
      "science",
      "technology",
      "enigmas",
      "gremayre",
      "kenning",
      "legerdemain",
      "archery",
      "commerce",
      "ride",
      "hearthWisdom",
      "seneschal",
      "theology",
      "dodge",
      "security",
      "linguistics",
      "enigmas_mta",
      "art",
      "martialArts",
      "meditation",
      "research",
      "cosmology",
      "esoterica",
    ]),
    abilitiesExtension: {
      talentName1: "",
      talentValue1: 0,
      talentName2: "",
      talentValue2: 0,
      skillName1: "",
      skillValue1: 0,
      skillName2: "",
      skillValue2: 0,
      knowledgeName1: "",
      knowledgeValue1: 0,
      knowledgeName2: "",
      knowledgeValue2: 0,
    },
    attributes: zeros([...ATTRIBUTE_KEYS]),
    backgrounds: [] as { name: string; value: number }[],
    disciplines: [] as { name: string; value: number }[],
    disciplinePaths: [],
    rituals: [],
    flaws: [] as string[],
    merits: [] as string[],
    notes: "",
    charHistory: "",
    goals: "",
    virtues: zeros([...VIRTUE_KEYS]),
    state: {
      willpowerRating: 0,
      willpowerPool: 0,
      experience: "",
      humanity: 0,
      pathName: "",
      bearingName: "",
      bearingModifier: "",
      bloodpool: 0,
      bloodPerTurn: "1",
      weakness: "",
      antithesis: "",
      thresholds: "",
      birthrightsFrailties: "",
      glamourRating: 0,
      glamourPool: 0,
      banalityRating: 0,
      banalityPool: 0,
      nightmare: 0,
      faith: 0,
      roadValue: 0,
      roadName: "",
      auraName: "",
      auraModifier: "",
      arete: 0,
      quintessence: 0,
      paradox: 0,
    },
    health: zeros([...HEALTH_KEYS]),
    healthChimerical: zeros([...HEALTH_KEYS]),
    arts: [],
    realms: zeros(["actor", "fae", "nature", "prop", "scene", "time"]),
    otherTraits: [],
    appearanceDescription: "",
    characterImage: "",
    alliesAndContacts: "",
    possessions: "",
    numinaAndOtherTraits: [],
    spheres: zeros([
      "correspondence",
      "entropy",
      "forces",
      "life",
      "matter",
      "mind",
      "prime",
      "spirit",
      "time",
    ]),
  };
}

/**
 * Write a sheet as the contents of a file the site can load.
 * What the site has and this sheet doesn't (history, goals, appearance) is left empty,
 * what this sheet has and the site doesn't (specialities, the lock) is lost.
 */
export function exportVtmcl(
  sheet: Sheet,
  notes: string,
  bloodPerTurn: number
): string {
  const target = createVtmclSheet();

  target.profile.name = sheet.name;
  target.profile.nature = sheet.nature;
  target.profile.age = sheet.age;
  target.profile.clan = sheet.clan;
  target.profile.generation = `${sheet.generation}-е`;
  for (const key of ATTRIBUTE_KEYS) {
    target.attributes[key] = sheet.attributes[key];
  }
  for (const key of ABILITY_KEYS) {
    target.abilities[key] = sheet.abilities[key];
  }
  for (const key of VIRTUE_KEYS) {
    target.virtues[key] = sheet.virtues[key];
  }
  target.disciplines = sheet.disciplines.map((trait) => ({ ...trait }));
  target.backgrounds = sheet.backgrounds.map((trait) => ({ ...trait }));
  target.merits = [...sheet.merits];
  target.flaws = [...sheet.flaws];
  target.notes = notes;
  target.state.humanity = sheet.humanity;
  target.state.pathName = sheet.path;
  target.state.willpowerRating = sheet.willpower;
  target.state.willpowerPool = sheet.willpowerPool;
  target.state.bloodpool = sheet.bloodPool;
  target.state.bloodPerTurn = `${bloodPerTurn}`;
  target.state.experience = sheet.experience;
  HEALTH_LEVELS.forEach((_, index) => {
    target.health[HEALTH_KEYS[index]] = sheet.health[index];
  });

  return JSON.stringify(
    {
      Settings: {
        backgroundColor: "#ababab",
        charsheetBackColor: "#ffffff",
        charsheetBackImage_v2: "",
        charsheetBackMode: "charsheet-color",
      },
      Version: VTMCL_VERSION,
      Charsheet: target,
    },
    null,
    2
  );
}
