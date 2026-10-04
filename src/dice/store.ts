import create from "zustand";
import { immer } from "zustand/middleware/immer";

import { DiceRoll } from "../types/DiceRoll";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { DiceTransform } from "../types/DiceTransform";
import { DiceThrower } from "../helpers/DiceThrower";
import { DiceThrow } from "../types/DiceThrow";
import { DEFAULT_DIFFICULTY, clampDifficulty } from "../v20/roll";

interface DiceRollState {
  roll: DiceRoll | null;
  /**
   * A mapping from the die ID to its roll result.
   * A value of `null` means the die hasn't finished rolling yet.
   */
  rollValues: Record<string, number | null>;
  /**
   * A mapping from the die ID to its final roll transform.
   * A value of `null` means the die hasn't finished rolling yet.
   */
  rollTransforms: Record<string, DiceTransform | null>;
  /**
   * A mapping from the die ID to its initial roll throw state.
   */
  rollThrows: Record<string, DiceThrow>;
  /**
   * The difficulty the successes of the current roll are counted against.
   * Goes back to the default with every new roll.
   */
  difficulty: number;
  startRoll: (roll: DiceRoll, speedMultiplier?: number) => void;
  clearRoll: (ids?: string) => void;
  finishDieRoll: (id: string, number: number, transform: DiceTransform) => void;
  setDifficulty: (difficulty: number) => void;
}

export const useDiceRollStore = create<DiceRollState>()(
  immer((set) => ({
    roll: null,
    rollValues: {},
    rollTransforms: {},
    rollThrows: {},
    difficulty: DEFAULT_DIFFICULTY,
    startRoll: (roll, speedMultiplier?: number) =>
      set((state) => {
        state.roll = roll;
        state.rollValues = {};
        state.rollTransforms = {};
        state.rollThrows = {};
        state.difficulty = DEFAULT_DIFFICULTY;
        // Use a thrower so that the dice of a big pool don't start inside each other
        const thrower = new DiceThrower();
        // Set all values to null
        const dice = getDieFromDice(roll);
        dice.forEach((die, index) => {
          state.rollValues[die.id] = null;
          state.rollTransforms[die.id] = null;
          state.rollThrows[die.id] = thrower.getDiceThrow(
            index,
            speedMultiplier
          );
        });
      }),
    clearRoll: () =>
      set((state) => {
        state.roll = null;
        state.rollValues = {};
        state.rollTransforms = {};
        state.rollThrows = {};
        state.difficulty = DEFAULT_DIFFICULTY;
      }),
    finishDieRoll: (id, number, transform) => {
      set((state) => {
        state.rollValues[id] = number;
        state.rollTransforms[id] = transform;
      });
    },
    setDifficulty: (difficulty) => {
      set((state) => {
        state.difficulty = clampDifficulty(difficulty);
      });
    },
  }))
);
