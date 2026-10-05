import create from "zustand";
import { immer } from "zustand/middleware/immer";

import { DiceRoll } from "../types/DiceRoll";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { DiceTransform } from "../types/DiceTransform";
import { DiceThrower, getRandomDiceThrow } from "../helpers/DiceThrower";
import { generateDiceId } from "../helpers/generateDiceId";
import { isDie } from "../types/Die";
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
  /** Count tens of the current roll twice, off again with every new roll */
  specialty: boolean;
  startRoll: (roll: DiceRoll, speedMultiplier?: number) => void;
  clearRoll: (ids?: string) => void;
  /** Reroll select ids of dice or reroll all dice by passing `undefined` */
  reroll: (ids?: string[], manualThrows?: Record<string, DiceThrow>) => void;
  finishDieRoll: (id: string, number: number, transform: DiceTransform) => void;
  setDifficulty: (difficulty: number) => void;
  setSpecialty: (specialty: boolean) => void;
}

export const useDiceRollStore = create<DiceRollState>()(
  immer((set) => ({
    roll: null,
    rollValues: {},
    rollTransforms: {},
    rollThrows: {},
    difficulty: DEFAULT_DIFFICULTY,
    specialty: false,
    startRoll: (roll, speedMultiplier?: number) =>
      set((state) => {
        state.roll = roll;
        state.rollValues = {};
        state.rollTransforms = {};
        state.rollThrows = {};
        state.difficulty = DEFAULT_DIFFICULTY;
        state.specialty = false;
        // Use a thrower so that the dice of a big pool don't start inside each other
        const thrower = new DiceThrower(roll.tray || 1);
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
        state.specialty = false;
      }),
    reroll: (ids, manualThrows) => {
      set((state) => {
        if (!state.roll) {
          return;
        }
        if (!ids) {
          // Rerolling everything is a new roll
          state.difficulty = DEFAULT_DIFFICULTY;
          state.specialty = false;
        }
        const trayWidth = state.roll.tray || 1;
        const thrower = new DiceThrower(trayWidth);
        let index = 0;
        for (const die of state.roll.dice) {
          if (isDie(die) && (!ids || ids.includes(die.id))) {
            delete state.rollValues[die.id];
            delete state.rollTransforms[die.id];
            delete state.rollThrows[die.id];
            const manualThrow = manualThrows?.[die.id];
            // A new id makes the die a new physics object for everyone watching
            const id = generateDiceId();
            die.id = id;
            state.rollValues[id] = null;
            state.rollTransforms[id] = null;
            if (manualThrow) {
              state.rollThrows[id] = manualThrow;
            } else if (ids) {
              state.rollThrows[id] = getRandomDiceThrow(undefined, trayWidth);
            } else {
              state.rollThrows[id] = thrower.getDiceThrow(index++);
            }
          }
        }
      });
    },
    finishDieRoll: (id, number, transform) => {
      set((state) => {
        state.rollValues[id] = number;
        state.rollTransforms[id] = transform;
      });
    },
    setSpecialty: (specialty) => {
      set((state) => {
        state.specialty = specialty;
      });
    },
    setDifficulty: (difficulty) => {
      set((state) => {
        state.difficulty = clampDifficulty(difficulty);
      });
    },
  }))
);
