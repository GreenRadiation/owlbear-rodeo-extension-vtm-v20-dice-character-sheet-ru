import create from "zustand";
import { immer } from "zustand/middleware/immer";
import { diceSets } from "../sets/diceSets";
import { DiceSet } from "../types/DiceSet";
import { Die } from "../types/Die";
import { generateDiceId } from "../helpers/generateDiceId";
import { getPluginId } from "../plugin/getPluginId";

/** The most dice that can be rolled at once */
export const MAX_POOL = 16;

const DICE_SET_STORAGE_KEY = getPluginId("dice-set");

interface DiceControlsState {
  diceSet: DiceSet;
  /** How many dice will be rolled */
  pool: number;
  diceHidden: boolean;
  diceRollPressTime: number | null;
  changeDiceSet: (diceSet: DiceSet) => void;
  resetPool: () => void;
  /** Add dice to the pool, a negative count removes them */
  addToPool: (count: number) => void;
  toggleDiceHidden: () => void;
  setDiceRollPressTime: (time: number | null) => void;
}

/** Restore the dice set the player picked last time */
function loadDiceSet(): DiceSet {
  try {
    const id = localStorage.getItem(DICE_SET_STORAGE_KEY);
    return diceSets.find((set) => set.id === id) || diceSets[0];
  } catch {
    return diceSets[0];
  }
}

function saveDiceSet(diceSet: DiceSet) {
  try {
    localStorage.setItem(DICE_SET_STORAGE_KEY, diceSet.id);
  } catch {
    // Storage can be unavailable, the choice just won't be remembered
  }
}

export const useDiceControlsStore = create<DiceControlsState>()(
  immer((set) => ({
    diceSet: loadDiceSet(),
    pool: 0,
    diceHidden: false,
    diceRollPressTime: null,
    changeDiceSet(diceSet) {
      saveDiceSet(diceSet);
      set((state) => {
        state.diceSet = diceSet;
      });
    },
    resetPool() {
      set((state) => {
        state.pool = 0;
      });
    },
    addToPool(count) {
      set((state) => {
        state.pool = Math.min(MAX_POOL, Math.max(0, state.pool + count));
      });
    },
    toggleDiceHidden() {
      set((state) => {
        state.diceHidden = !state.diceHidden;
      });
    },
    setDiceRollPressTime(time) {
      set((state) => {
        state.diceRollPressTime = time;
      });
    },
  }))
);

/** Generate new dice for a pool using the die of the given set */
export function getDiceToRoll(pool: number, diceSet: DiceSet): Die[] {
  const { style, type } = diceSet.dice[0];
  const dice: Die[] = [];
  for (let i = 0; i < pool; i++) {
    dice.push({ id: generateDiceId(), style, type });
  }
  return dice;
}
