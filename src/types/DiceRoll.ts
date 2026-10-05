import { Dice } from "./Dice";

/**
 * The roll of a set of dice.
 * See `Dice` type for examples of usage
 */
export interface DiceRoll extends Dice {
  /** The values of the roll aren't shown to the other players */
  hidden?: boolean;
  /** A hidden roll that the GM can see */
  gm?: boolean;
  /**
   * Size of the dice relative to the dice of the original roller (1 if undefined).
   * Part of the roll because everyone watching has to simulate dice of the same size.
   */
  scale?: number;
  /**
   * Width of the tray the roll was made in relative to the tray of the original
   * roller (1 if undefined). Part of the roll for the same reason as the scale.
   */
  tray?: number;
  /**
   * The look of the dice of the "CUSTOM" style, a `DiceLook`.
   * Part of the roll for everyone to see the dice of the player the same.
   * Comes from another player: not to be trusted, see `sanitizeLook`.
   */
  look?: unknown;
}
