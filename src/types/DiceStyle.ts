export type DiceStyle =
  | "GALAXY"
  | "GEMSTONE"
  | "GLASS"
  | "IRON"
  | "NEBULA"
  | "SUNRISE"
  | "SUNSET"
  | "WALNUT"
  /** Painted from the look the player put together, see dice/look.ts */
  | "CUSTOM";

/** The styles that come as image files */
export type ImageDiceStyle = Exclude<DiceStyle, "CUSTOM">;
