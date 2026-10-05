/**
 * The look of the custom dice of a player.
 * Pure data and functions: no React, no three.js, no Owlbear Rodeo SDK.
 *
 * A look travels with a roll (`DiceRoll.look`) so that everyone sees the dice
 * of the player the same. It comes from other players and from the storage of
 * the browser: always run it through `sanitizeLook`.
 */

/** How the two colors of the body are laid out on a die */
export const PATTERNS = [
  "solid",
  "gradient",
  "halves",
  "rings",
  "marble",
  "speckles",
] as const;
export type Pattern = (typeof PATTERNS)[number];

/** What the surface of a die is like, on top of its roughness and metalness */
export const FINISHES = [
  "plastic",
  "gloss",
  "metal",
  "pearl",
  "glass",
] as const;
export type Finish = (typeof FINISHES)[number];

export interface DiceLook {
  /** The color of the body, "#rrggbb" */
  body: string;
  /** The second color of the body, only seen with a pattern */
  body2: string;
  pattern: Pattern;
  /** How much of the second color the pattern brings in, 0 to 1 */
  patternStrength: number;
  /** The color of the digits */
  digits: string;
  /** How much the digits glow, 0 to 1 */
  glow: number;
  /** The color of the ten and of the one, an empty string for the color of the digits */
  tenColor: string;
  oneColor: string;
  /** Id of the icon that replaces the "0" and the "1", an empty string for the digit itself */
  tenIcon: string;
  oneIcon: string;
  finish: Finish;
  /** 0 to 1 */
  roughness: number;
  /** 0 to 1 */
  metalness: number;
}

/** Red dice with an ankh for a ten: what a new player starts from */
export const DEFAULT_LOOK: DiceLook = {
  body: "#8a1020",
  body2: "#1a0508",
  pattern: "marble",
  patternStrength: 0.7,
  digits: "#f0e6d2",
  glow: 0,
  tenColor: "#ffd24a",
  oneColor: "",
  tenIcon: "ankh",
  oneIcon: "skull",
  finish: "gloss",
  roughness: 0.25,
  metalness: 0,
};

/** The roughness and the metalness a finish starts with when it is picked */
export const FINISH_DEFAULTS: Record<
  Finish,
  Pick<DiceLook, "roughness" | "metalness">
> = {
  plastic: { roughness: 0.5, metalness: 0 },
  gloss: { roughness: 0.25, metalness: 0 },
  metal: { roughness: 0.35, metalness: 1 },
  pearl: { roughness: 0.3, metalness: 0.2 },
  glass: { roughness: 0.15, metalness: 0 },
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

function unit(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(Math.min(1, Math.max(0, value)) * 100) / 100
    : fallback;
}

function icon(value: unknown, icons: readonly string[], fallback: string) {
  if (typeof value !== "string") {
    return icons.includes(fallback) ? fallback : "";
  }
  // An icon this version of the extension doesn't have is shown as the digit
  return icons.includes(value) ? value : "";
}

/**
 * Make a valid look out of anything.
 * `icons` are the ids of the icons this version of the extension has.
 */
export function sanitizeLook(
  value: unknown,
  icons: readonly string[]
): DiceLook {
  const stored = (
    typeof value === "object" && value !== null ? value : {}
  ) as Record<string, unknown>;
  const d = DEFAULT_LOOK;
  return {
    body: color(stored.body, d.body),
    body2: color(stored.body2, d.body2),
    pattern: PATTERNS.includes(stored.pattern as Pattern)
      ? (stored.pattern as Pattern)
      : d.pattern,
    patternStrength: unit(stored.patternStrength, d.patternStrength),
    digits: color(stored.digits, d.digits),
    glow: unit(stored.glow, d.glow),
    tenColor: color(stored.tenColor, d.tenColor, true),
    oneColor: color(stored.oneColor, d.oneColor, true),
    tenIcon: icon(stored.tenIcon, icons, d.tenIcon),
    oneIcon: icon(stored.oneIcon, icons, d.oneIcon),
    finish: FINISHES.includes(stored.finish as Finish)
      ? (stored.finish as Finish)
      : d.finish,
    roughness: unit(stored.roughness, d.roughness),
    metalness: unit(stored.metalness, d.metalness),
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
  icons: readonly string[],
  random: () => number = Math.random
): DiceLook {
  const pick = <T>(choices: readonly T[]) =>
    choices[Math.floor(random() * choices.length) % choices.length];
  const hue = random();
  // A dark body gets light digits and the other way around
  const dark = random() < 0.7;
  const bodyLightness = dark ? 0.12 + random() * 0.25 : 0.65 + random() * 0.2;
  const finish = pick(FINISHES);
  const withIcon = () =>
    random() < 0.6 && icons.length > 0 ? pick(icons) : "";
  return sanitizeLook(
    {
      body: hsl(hue, 0.5 + random() * 0.5, bodyLightness),
      body2: hsl(
        (hue + pick([0, 0.08, 0.5, 0.92])) % 1,
        0.4 + random() * 0.6,
        dark ? random() * 0.5 : 0.4 + random() * 0.5
      ),
      pattern: pick(PATTERNS),
      patternStrength: 0.4 + random() * 0.6,
      digits: dark ? hsl(hue, 0.2, 0.9) : hsl(hue, 0.4, 0.08),
      glow: random() < 0.25 ? 0.3 + random() * 0.7 : 0,
      tenColor:
        random() < 0.5 ? hsl((hue + 0.5) % 1, 0.9, dark ? 0.65 : 0.3) : "",
      oneColor: random() < 0.3 ? hsl(0, 0.9, dark ? 0.6 : 0.35) : "",
      tenIcon: withIcon(),
      oneIcon: withIcon(),
      finish,
      ...FINISH_DEFAULTS[finish],
    },
    icons
  );
}
