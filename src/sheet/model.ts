/**
 * A Vampire: The Masquerade V20 character sheet.
 * Pure data and functions: no React, no Owlbear Rodeo SDK.
 *
 * Only what the group uses at the table is here: the traits with dots and the
 * trackers. The descriptive parts of a full sheet are left out on purpose.
 * The names follow the Russian edition of V20 by Studio 101.
 */

export const ATTRIBUTE_GROUPS = [
  { name: "Физические", keys: ["strength", "dexterity", "stamina"] },
  { name: "Социальные", keys: ["charisma", "manipulation", "appearance"] },
  { name: "Ментальные", keys: ["perception", "intelligence", "wits"] },
] as const;

export const ABILITY_GROUPS = [
  {
    name: "Таланты",
    keys: [
      "athletics",
      "alertness",
      "brawl",
      "intimidation",
      "expression",
      "leadership",
      "streetwise",
      "subterfuge",
      "awareness",
      "empathy",
    ],
  },
  {
    name: "Навыки",
    keys: [
      "drive",
      "larceny",
      "survival",
      "performance",
      "animalken",
      "crafts",
      "stealth",
      "firearms",
      "melee",
      "etiquette",
    ],
  },
  {
    name: "Знания",
    keys: [
      "academics",
      "science",
      "law",
      "computer",
      "medicine",
      "occult",
      "politics",
      "investigation",
      "finance",
      "technology",
    ],
  },
] as const;

export type AttributeKey = typeof ATTRIBUTE_GROUPS[number]["keys"][number];
export type AbilityKey = typeof ABILITY_GROUPS[number]["keys"][number];
/** A trait that can have a speciality */
export type TraitKey = AttributeKey | AbilityKey;

/**
 * The order of the keys is the order they are stored in (see codec.ts),
 * never reorder or remove them.
 */
export const ATTRIBUTE_KEYS: AttributeKey[] = ATTRIBUTE_GROUPS.flatMap(
  (group) => [...group.keys]
);
export const ABILITY_KEYS: AbilityKey[] = ABILITY_GROUPS.flatMap((group) => [
  ...group.keys,
]);
export const TRAIT_KEYS: TraitKey[] = [...ATTRIBUTE_KEYS, ...ABILITY_KEYS];

/** The attributes that can be raised with blood */
export const PHYSICAL_KEYS = ["strength", "dexterity", "stamina"] as const;
export type PhysicalKey = typeof PHYSICAL_KEYS[number];

export const TRAIT_NAMES: Record<TraitKey, string> = {
  strength: "Сила",
  dexterity: "Ловкость",
  stamina: "Выносливость",
  charisma: "Обаяние",
  manipulation: "Манипуляция",
  appearance: "Привлекательность",
  perception: "Восприятие",
  intelligence: "Интеллект",
  wits: "Смекалка",
  athletics: "Атлетика",
  alertness: "Бдительность",
  brawl: "Драка",
  intimidation: "Запугивание",
  expression: "Красноречие",
  leadership: "Лидерство",
  streetwise: "Уличное чутьё",
  subterfuge: "Хитрость",
  awareness: "Шестое чувство",
  empathy: "Эмпатия",
  drive: "Вождение",
  larceny: "Воровство",
  survival: "Выживание",
  performance: "Исполнение",
  animalken: "Обр. с животными",
  crafts: "Ремесло",
  stealth: "Скрытность",
  firearms: "Стрельба",
  melee: "Фехтование",
  etiquette: "Этикет",
  academics: "Гум. науки",
  science: "Ест. науки",
  law: "Законы",
  computer: "Информатика",
  medicine: "Медицина",
  occult: "Оккультизм",
  politics: "Политика",
  investigation: "Расследование",
  finance: "Финансы",
  technology: "Электроника",
};

export const VIRTUE_KEYS = ["conscience", "self_control", "courage"] as const;
export type VirtueKey = typeof VIRTUE_KEYS[number];
export const VIRTUE_NAMES: Record<VirtueKey, string> = {
  conscience: "Совесть/Решимость",
  self_control: "Самоконтроль/Инстинкты",
  courage: "Смелость",
};

/** Health levels from the lightest to the heaviest with their dice penalties */
export const HEALTH_LEVELS = [
  { name: "Помят", penalty: "" },
  { name: "Легко ранен", penalty: "−1" },
  { name: "Ранен", penalty: "−1" },
  { name: "Серьёзно ранен", penalty: "−2" },
  { name: "Тяжело ранен", penalty: "−2" },
  { name: "Едва жив", penalty: "−5" },
  { name: "При смерти", penalty: "" },
] as const;

/** Kinds of damage of a health level: none, bashing, lethal, aggravated */
export const DAMAGE_NAMES = [
  "Нет повреждений",
  "Лёгкие повреждения",
  "Тяжёлые повреждения",
  "Губительные повреждения",
] as const;
export const MAX_DAMAGE = DAMAGE_NAMES.length - 1;

export const MAX_DOTS = 5;
export const MAX_HUMANITY = 10;
export const MAX_WILLPOWER = 10;

export const MIN_GENERATION = 4;
export const MAX_GENERATION = 15;
export const DEFAULT_GENERATION = 13;

/** Size of the blood pool and how much blood can be spent in a turn by generation (V20) */
const BLOOD_BY_GENERATION: Record<number, { pool: number; perTurn: number }> = {
  4: { pool: 50, perTurn: 10 },
  5: { pool: 40, perTurn: 8 },
  6: { pool: 30, perTurn: 6 },
  7: { pool: 20, perTurn: 4 },
  8: { pool: 15, perTurn: 3 },
  9: { pool: 14, perTurn: 2 },
  10: { pool: 13, perTurn: 1 },
  11: { pool: 12, perTurn: 1 },
  12: { pool: 11, perTurn: 1 },
  13: { pool: 10, perTurn: 1 },
  14: { pool: 10, perTurn: 1 },
  15: { pool: 10, perTurn: 1 },
};

export function getBlood(generation: number) {
  return BLOOD_BY_GENERATION[generation] || BLOOD_BY_GENERATION[13];
}

/** A discipline or a background: a trait with a name picked by the player */
export interface NamedTrait {
  name: string;
  value: number;
}

export interface Sheet {
  name: string;
  nature: string;
  age: string;
  clan: string;
  generation: number;
  attributes: Record<AttributeKey, number>;
  abilities: Record<AbilityKey, number>;
  /** Notes about the specialities of traits, they don't change the rolls */
  specialties: Partial<Record<TraitKey, string>>;
  disciplines: NamedTrait[];
  backgrounds: NamedTrait[];
  virtues: Record<VirtueKey, number>;
  humanity: number;
  /** Name of the path of enlightenment, empty for Humanity */
  path: string;
  /** Permanent Willpower */
  willpower: number;
  /** Willpower points left to spend */
  willpowerPool: number;
  bloodPool: number;
  /** Kind of damage of every health level, see HEALTH_LEVELS and DAMAGE_NAMES */
  health: number[];
  merits: string[];
  flaws: string[];
  experience: string;
  /** A locked sheet can't be edited, only its trackers can be used */
  locked: boolean;
  /** Dots temporarily added to the physical attributes by spending blood */
  bloodDots: Record<PhysicalKey, number>;
}

function fill<K extends string>(keys: readonly K[], value: number) {
  const result = {} as Record<K, number>;
  for (const key of keys) {
    result[key] = value;
  }
  return result;
}

export function createSheet(): Sheet {
  return {
    name: "",
    nature: "",
    age: "",
    clan: "",
    generation: DEFAULT_GENERATION,
    attributes: fill(ATTRIBUTE_KEYS, 1),
    abilities: fill(ABILITY_KEYS, 0),
    specialties: {},
    disciplines: [],
    backgrounds: [],
    virtues: fill(VIRTUE_KEYS, 1),
    humanity: 0,
    path: "",
    willpower: 0,
    willpowerPool: 0,
    bloodPool: 0,
    health: HEALTH_LEVELS.map(() => 0),
    merits: [],
    flaws: [],
    experience: "",
    locked: false,
    bloodDots: fill(PHYSICAL_KEYS, 0),
  };
}

/** Limits of the texts so that a sheet can't eat the little space a room has */
export const MAX_NAME_LENGTH = 40;
export const MAX_SHORT_TEXT_LENGTH = 60;
export const MAX_LIST_LENGTH = 12;

function int(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "string" ? Number.parseInt(value, 10) : value;
  return typeof number === "number" && Number.isFinite(number)
    ? Math.min(max, Math.max(min, Math.round(number)))
    : fallback;
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value.slice(0, MAX_LIST_LENGTH) : [];
}

function namedTraits(value: unknown): NamedTrait[] {
  return list(value).map((item) => {
    const trait = record(item);
    return {
      name: text(trait.name, MAX_SHORT_TEXT_LENGTH),
      value: int(trait.value, 0, MAX_DOTS, 0),
    };
  });
}

/** Make a valid sheet out of anything, used for everything that comes from outside */
export function sanitizeSheet(value: unknown): Sheet {
  const source = record(value);
  const sheet = createSheet();

  sheet.name = text(source.name, MAX_NAME_LENGTH);
  sheet.nature = text(source.nature, MAX_SHORT_TEXT_LENGTH);
  sheet.age = text(source.age, MAX_SHORT_TEXT_LENGTH);
  sheet.clan = text(source.clan, MAX_SHORT_TEXT_LENGTH);
  sheet.generation = int(
    source.generation,
    MIN_GENERATION,
    MAX_GENERATION,
    DEFAULT_GENERATION
  );

  const attributes = record(source.attributes);
  for (const key of ATTRIBUTE_KEYS) {
    sheet.attributes[key] = int(attributes[key], 0, MAX_DOTS, 1);
  }
  const abilities = record(source.abilities);
  for (const key of ABILITY_KEYS) {
    sheet.abilities[key] = int(abilities[key], 0, MAX_DOTS, 0);
  }
  const specialties = record(source.specialties);
  for (const key of TRAIT_KEYS) {
    const specialty = text(specialties[key], MAX_SHORT_TEXT_LENGTH);
    if (specialty) {
      sheet.specialties[key] = specialty;
    }
  }

  sheet.disciplines = namedTraits(source.disciplines);
  sheet.backgrounds = namedTraits(source.backgrounds);

  const virtues = record(source.virtues);
  for (const key of VIRTUE_KEYS) {
    sheet.virtues[key] = int(virtues[key], 0, MAX_DOTS, 1);
  }

  sheet.humanity = int(source.humanity, 0, MAX_HUMANITY, 0);
  sheet.path = text(source.path, MAX_SHORT_TEXT_LENGTH);
  sheet.willpower = int(source.willpower, 0, MAX_WILLPOWER, 0);
  sheet.willpowerPool = int(source.willpowerPool, 0, MAX_WILLPOWER, 0);
  sheet.bloodPool = int(
    source.bloodPool,
    0,
    getBlood(sheet.generation).pool,
    0
  );

  const health = Array.isArray(source.health) ? source.health : [];
  sheet.health = HEALTH_LEVELS.map((_, index) =>
    int(health[index], 0, MAX_DAMAGE, 0)
  );

  sheet.merits = list(source.merits)
    .map((merit) => text(merit, MAX_SHORT_TEXT_LENGTH))
    .filter(Boolean);
  sheet.flaws = list(source.flaws)
    .map((flaw) => text(flaw, MAX_SHORT_TEXT_LENGTH))
    .filter(Boolean);
  sheet.experience = text(source.experience, MAX_SHORT_TEXT_LENGTH);
  sheet.locked = source.locked === true;

  const bloodDots = record(source.bloodDots);
  for (const key of PHYSICAL_KEYS) {
    // Blood can only fill the dots the attribute doesn't have yet
    sheet.bloodDots[key] = int(
      bloodDots[key],
      0,
      MAX_DOTS - sheet.attributes[key],
      0
    );
  }

  return sheet;
}

/** How many dice a physical attribute adds to a pool: its dots and the dots bought with blood */
export function getAttributeDice(sheet: Sheet, key: AttributeKey): number {
  const blood = (PHYSICAL_KEYS as readonly string[]).includes(key)
    ? sheet.bloodDots[key as PhysicalKey]
    : 0;
  return sheet.attributes[key] + blood;
}

/**
 * The value of a row of dots or squares after a click on one of them.
 * A click on an empty dot fills the row up to it,
 * a click on a filled dot clears the row from it on.
 * `index` starts at 0.
 */
export function clickDots(value: number, index: number): number {
  return index < value ? index : index + 1;
}

/**
 * The dots bought with blood after a click on a dot of a physical attribute
 * of a locked sheet. The permanent dots can't be changed this way.
 */
export function clickBloodDots(
  permanent: number,
  blood: number,
  index: number
): number {
  if (index < permanent) {
    return blood;
  }
  return clickDots(blood, index - permanent);
}

/** Unlocking a sheet removes the dots bought with blood */
export function setLocked(sheet: Sheet, locked: boolean): Sheet {
  return {
    ...sheet,
    locked,
    bloodDots: locked ? sheet.bloodDots : fill(PHYSICAL_KEYS, 0),
  };
}
