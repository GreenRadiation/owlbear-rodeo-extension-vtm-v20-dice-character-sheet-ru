/**
 * The look of the custom dice of a player.
 * Pure data and functions: no React, no three.js, no Owlbear Rodeo SDK.
 *
 * A look travels with a roll (`DiceRoll.look`) so that everyone sees the dice
 * of the player the same. It comes from other players and from the storage of
 * the browser: always run it through `sanitizeLook`.
 */

/** Patterns that are computed */
export const DRAWN_PATTERNS = [
  "solid",
  "gradient",
  "halves",
  "rings",
  "marble",
  "speckles",
] as const;
/** Patterns taken from the textures of the dice of the original roller and painted in the colors of the look */
export const TEXTURE_PATTERNS = [
  "galaxy",
  "gemstone",
  "nebula",
  "sunrise",
  "sunset",
  "walnut",
] as const;
/** How the two colors of the body are laid out on a die */
export const PATTERNS = [...DRAWN_PATTERNS, ...TEXTURE_PATTERNS] as const;
export type DrawnPattern = (typeof DRAWN_PATTERNS)[number];
export type TexturePattern = (typeof TEXTURE_PATTERNS)[number];
export type Pattern = (typeof PATTERNS)[number];

export function isTexturePattern(pattern: Pattern): pattern is TexturePattern {
  return (TEXTURE_PATTERNS as readonly string[]).includes(pattern);
}

/**
 * Colors are "#rrggbb". Numbers go from 0 to 1 unless said otherwise.
 * An empty string for a color that can be left out means it is.
 */
export interface DiceLook {
  /** The color of the body */
  body: string;
  /** The second color of the body, only seen with a pattern */
  body2: string;
  pattern: Pattern;
  /** How much of the second color the pattern brings in */
  patternStrength: number;
  /** How big the details of a computed pattern are, 0.5 is their usual size */
  patternScale: number;
  /** Which color the pattern leans to: 0 only the first, 1 only the second, 0.5 as the pattern is */
  patternBalance: number;

  /** The color of the digits */
  digits: string;
  /** The second color of the digits: they get the pattern of the body. Can be left out */
  digits2: string;
  /** The color of a line around the digits and how wide it is. The color can be left out */
  outline: string;
  outlineWidth: number;
  /** How much the digits glow */
  glow: number;
  /** How deep the digits are cut into the die, -1 to 1: below zero they stick out */
  engraving: number;
  /** How wide the slope at the edge of a digit is */
  bevel: number;
  /** Id of the font the digits are written in, an empty string for the digits of the original dice */
  font: string;
  /** Every die of a roll gets its own take on the pattern */
  unique: boolean;
  /** The surface of the digits: paint is rough and not a metal, gold leaf is the opposite */
  digitsRoughness: number;
  digitsMetalness: number;
  /** The lacquer and the shimmer of the body go over the digits too */
  digitsCoated: boolean;

  /** The color of the ten and of the one, left out for the color of the digits */
  tenColor: string;
  oneColor: string;
  /** The ten and the one can have a surface of their own instead of the one of the digits */
  tenSurface: boolean;
  tenRoughness: number;
  tenMetalness: number;
  oneSurface: boolean;
  oneRoughness: number;
  oneMetalness: number;
  /** Id of the icon that replaces the "0" and the "1", an empty string for the digit itself */
  tenIcon: string;
  oneIcon: string;

  roughness: number;
  metalness: number;
  /** A layer of clear lacquer over the die and how matte it is */
  clearcoat: number;
  clearcoatRoughness: number;
  /** A shimmer like on a pearl or a soap bubble and which colors it goes through */
  iridescence: number;
  iridescenceHue: number;
  /** How much the film of the shimmer bends light, together with the hue picks its colors */
  iridescenceIor: number;
  /** A soft glow at the edges like on velvet and its color */
  sheen: number;
  sheenColor: string;
  /** How much light passes through the body, the digits stay solid */
  transmission: number;
  /** How strong the highlights are and their color */
  specular: number;
  specularColor: string;
  /** How much of the surroundings the die reflects, 0.5 is the same as the other dice */
  reflections: number;
}

export type Surface = Pick<
  DiceLook,
  | "roughness"
  | "metalness"
  | "clearcoat"
  | "clearcoatRoughness"
  | "iridescence"
  | "iridescenceHue"
  | "iridescenceIor"
  | "sheen"
  | "transmission"
  | "specular"
  | "reflections"
>;

/** Ready-made surfaces to start from, every slider can be changed after one is picked */
export const FINISHES = [
  "plastic",
  "gloss",
  "metal",
  "pearl",
  "glass",
] as const;
export type Finish = (typeof FINISHES)[number];

const PLAIN_SURFACE: Surface = {
  roughness: 0.5,
  metalness: 0,
  clearcoat: 0,
  clearcoatRoughness: 0.3,
  iridescence: 0,
  iridescenceHue: 0.4,
  iridescenceIor: 0.5,
  sheen: 0,
  transmission: 0,
  // The light of the tray comes from above, right where the camera is: at full
  // strength its reflection washes out the top faces of dark dice
  specular: 0.4,
  reflections: 0.5,
};

export const FINISH_PRESETS: Record<Finish, Surface> = {
  plastic: PLAIN_SURFACE,
  gloss: { ...PLAIN_SURFACE, roughness: 0.25, clearcoat: 0.6 },
  metal: { ...PLAIN_SURFACE, roughness: 0.35, metalness: 1 },
  // Glossy: on a matte die the shimmer is a broad bright spot instead of colors
  pearl: {
    ...PLAIN_SURFACE,
    roughness: 0.12,
    metalness: 0.1,
    iridescence: 1,
    iridescenceHue: 0.36,
  },
  glass: { ...PLAIN_SURFACE, roughness: 0.15, transmission: 1 },
};

/** Red dice with a golden ankh for a ten: what a new player starts from */
export const DEFAULT_LOOK: DiceLook = {
  body: "#8a1020",
  body2: "#1a0508",
  pattern: "marble",
  patternStrength: 0.7,
  patternScale: 0.5,
  patternBalance: 0.5,
  digits: "#f0e6d2",
  digits2: "",
  outline: "",
  outlineWidth: 0.4,
  glow: 0,
  engraving: 0.5,
  bevel: 0.4,
  font: "",
  unique: false,
  digitsRoughness: 0.8,
  digitsMetalness: 0,
  digitsCoated: true,
  tenColor: "#ffd24a",
  oneColor: "",
  tenSurface: false,
  tenRoughness: 0.3,
  tenMetalness: 1,
  oneSurface: false,
  oneRoughness: 0.3,
  oneMetalness: 1,
  tenIcon: "ankh",
  oneIcon: "skull",
  ...FINISH_PRESETS.gloss,
  sheenColor: "#ffffff",
  specularColor: "#ffffff",
};

/** What the second slot of custom dice starts from: black dice with pale digits */
export const SECOND_LOOK: DiceLook = {
  ...DEFAULT_LOOK,
  body: "#15151a",
  body2: "#3a3f55",
  pattern: "speckles",
  patternStrength: 0.6,
  digits: "#d8dce6",
  tenColor: "#e23b3b",
  ...FINISH_PRESETS.plastic,
};

const COLOR = /^#[0-9a-f]{6}$/;

function color(value: unknown, fallback: string, allowEmpty = false) {
  if (allowEmpty && value === "") {
    return "";
  }
  if (typeof value === "string" && COLOR.test(value.toLowerCase())) {
    return value.toLowerCase();
  }
  return fallback;
}

function number(value: unknown, fallback: number, min = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(Math.min(1, Math.max(min, value)) * 100) / 100
    : fallback;
}

function icon(value: unknown, icons: readonly string[], fallback: string) {
  if (typeof value !== "string") {
    return icons.includes(fallback) ? fallback : "";
  }
  // An icon this version of the extension doesn't have is shown as the digit
  return icons.includes(value) ? value : "";
}

/** What this version of the extension has for a look to pick from */
export interface LookAssets {
  /** Ids of the icons */
  icons: readonly string[];
  /** Ids of the fonts */
  fonts: readonly string[];
}

/**
 * Make a valid look out of anything.
 * `assets` are the icons and the fonts this version of the extension has,
 * ids alone stand for icons.
 * What is missing or wrong is taken from `fallback`.
 */
export function sanitizeLook(
  value: unknown,
  assets: readonly string[] | LookAssets,
  fallback: DiceLook = DEFAULT_LOOK
): DiceLook {
  const icons = Array.isArray(assets) ? assets : (assets as LookAssets).icons;
  const fonts = Array.isArray(assets) ? [] : (assets as LookAssets).fonts;
  const stored = (
    typeof value === "object" && value !== null ? value : {}
  ) as Record<string, unknown>;
  // The first version of the looks had a named finish instead of the sliders of a surface
  const d: DiceLook =
    stored.clearcoat === undefined && FINISHES.includes(stored.finish as Finish)
      ? { ...fallback, ...FINISH_PRESETS[stored.finish as Finish] }
      : fallback;
  return {
    body: color(stored.body, d.body),
    body2: color(stored.body2, d.body2),
    pattern: PATTERNS.includes(stored.pattern as Pattern)
      ? (stored.pattern as Pattern)
      : d.pattern,
    patternStrength: number(stored.patternStrength, d.patternStrength),
    patternScale: number(stored.patternScale, d.patternScale),
    patternBalance: number(stored.patternBalance, d.patternBalance),
    digits: color(stored.digits, d.digits),
    digits2: color(stored.digits2, d.digits2, true),
    outline: color(stored.outline, d.outline, true),
    outlineWidth: number(stored.outlineWidth, d.outlineWidth),
    glow: number(stored.glow, d.glow),
    engraving: number(stored.engraving, d.engraving, -1),
    bevel: number(stored.bevel, d.bevel),
    // A font this version of the extension doesn't have falls back to the original digits
    font:
      typeof stored.font === "string" && fonts.includes(stored.font)
        ? stored.font
        : "",
    unique: typeof stored.unique === "boolean" ? stored.unique : d.unique,
    digitsRoughness: number(stored.digitsRoughness, d.digitsRoughness),
    digitsMetalness: number(stored.digitsMetalness, d.digitsMetalness),
    digitsCoated:
      typeof stored.digitsCoated === "boolean"
        ? stored.digitsCoated
        : d.digitsCoated,
    tenColor: color(stored.tenColor, d.tenColor, true),
    oneColor: color(stored.oneColor, d.oneColor, true),
    tenSurface:
      typeof stored.tenSurface === "boolean" ? stored.tenSurface : d.tenSurface,
    tenRoughness: number(stored.tenRoughness, d.tenRoughness),
    tenMetalness: number(stored.tenMetalness, d.tenMetalness),
    oneSurface:
      typeof stored.oneSurface === "boolean" ? stored.oneSurface : d.oneSurface,
    oneRoughness: number(stored.oneRoughness, d.oneRoughness),
    oneMetalness: number(stored.oneMetalness, d.oneMetalness),
    tenIcon: icon(stored.tenIcon, icons, d.tenIcon),
    oneIcon: icon(stored.oneIcon, icons, d.oneIcon),
    roughness: number(stored.roughness, d.roughness),
    metalness: number(stored.metalness, d.metalness),
    clearcoat: number(stored.clearcoat, d.clearcoat),
    clearcoatRoughness: number(stored.clearcoatRoughness, d.clearcoatRoughness),
    iridescence: number(stored.iridescence, d.iridescence),
    iridescenceHue: number(stored.iridescenceHue, d.iridescenceHue),
    iridescenceIor: number(stored.iridescenceIor, d.iridescenceIor),
    sheen: number(stored.sheen, d.sheen),
    sheenColor: color(stored.sheenColor, d.sheenColor),
    transmission: number(stored.transmission, d.transmission),
    specular: number(stored.specular, d.specular),
    specularColor: color(stored.specularColor, d.specularColor),
    reflections: number(stored.reflections, d.reflections),
  };
}

/** "#rrggbb" to its three channels, 0 to 255 */
export function parseColor(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
}

/** Hue in turns, saturation and lightness from 0 to 1 */
function hsl(h: number, s: number, l: number) {
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h * 12) % 12;
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return toHex(channel(0), channel(8), channel(4));
}

/**
 * A random look that is readable: the digits always contrast with the body.
 * `random` returns numbers from 0 to 1 like Math.random.
 */
export function randomLook(
  assets: readonly string[] | LookAssets,
  random: () => number = Math.random
): DiceLook {
  const icons = Array.isArray(assets) ? assets : (assets as LookAssets).icons;
  const fonts = Array.isArray(assets) ? [] : (assets as LookAssets).fonts;
  const pick = <T>(choices: readonly T[]) =>
    choices[Math.floor(random() * choices.length) % choices.length];
  const hue = random();
  // A dark body gets light digits and the other way around
  const dark = random() < 0.7;
  const bodyLightness = dark ? 0.12 + random() * 0.25 : 0.65 + random() * 0.2;
  const surface = { ...FINISH_PRESETS[pick(FINISHES)] };
  if (surface.iridescence > 0) {
    surface.iridescenceHue = random();
  }
  const metalDigits = random() < 0.3;
  const withIcon = () =>
    random() < 0.6 && icons.length > 0 ? pick(icons) : "";
  return sanitizeLook(
    {
      body: hsl(hue, 0.5 + random() * 0.5, bodyLightness),
      // Stays on the side of the body: a pattern that crosses over to the
      // lightness of the digits would hide them
      body2: hsl(
        (hue + pick([0, 0.08, 0.5, 0.92])) % 1,
        0.4 + random() * 0.6,
        dark ? random() * 0.4 : 0.55 + random() * 0.35
      ),
      pattern: pick(PATTERNS),
      patternStrength: 0.4 + random() * 0.6,
      patternScale: 0.3 + random() * 0.4,
      patternBalance: 0.3 + random() * 0.4,
      digits: dark ? hsl(hue, 0.2, 0.9) : hsl(hue, 0.4, 0.08),
      digits2: "",
      outline: random() < 0.2 ? (dark ? "#000000" : "#ffffff") : "",
      outlineWidth: 0.2 + random() * 0.5,
      bevel: 0.2 + random() * 0.6,
      font: random() < 0.5 && fonts.length > 0 ? pick(fonts) : "",
      unique: random() < 0.5,
      glow: random() < 0.25 ? 0.3 + random() * 0.7 : 0,
      engraving: 0.3 + random() * 0.5,
      digitsRoughness: metalDigits ? 0.3 : 0.8,
      digitsMetalness: metalDigits ? 1 : 0,
      digitsCoated: random() < 0.7,
      tenColor:
        random() < 0.5 ? hsl((hue + 0.5) % 1, 0.9, dark ? 0.65 : 0.3) : "",
      oneColor: random() < 0.3 ? hsl(0, 0.9, dark ? 0.6 : 0.35) : "",
      tenIcon: withIcon(),
      oneIcon: withIcon(),
      ...surface,
      sheenColor: hsl(random(), 0.6, 0.7),
      specularColor: "#ffffff",
    },
    assets
  );
}
