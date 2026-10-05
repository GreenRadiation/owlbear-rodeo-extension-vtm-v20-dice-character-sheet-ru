import create from "zustand";
import { immer } from "zustand/middleware/immer";
import { diceSets } from "../sets/diceSets";
import { DiceSet } from "../types/DiceSet";
import { Die } from "../types/Die";
import { generateDiceId } from "../helpers/generateDiceId";
import { getPluginId } from "../plugin/getPluginId";
import {
  DEFAULT_LOOK,
  DiceLook,
  SECOND_LOOK,
  sanitizeLook,
} from "../dice/look";
import { LOOK_ASSETS } from "../materials/custom/assets";

/** Who sees a roll: everyone, only the GM or no one but the player who rolls */
export type Visibility = "ALL" | "GM" | "NONE";
const VISIBILITIES: Visibility[] = ["ALL", "GM", "NONE"];

/** The most dice that can be rolled at once */
export const MAX_POOL = 16;

const DICE_SET_STORAGE_KEY = getPluginId("dice-set");
/** Where the look of every slot of custom dice is kept */
const DICE_LOOK_STORAGE_KEYS = [
  getPluginId("dice-look"),
  getPluginId("dice-look-2"),
];

interface DiceControlsState {
  diceSet: DiceSet;
  /** The looks of the custom dice of the player, one for every slot of custom dice */
  looks: DiceLook[];
  /** How many dice will be rolled */
  pool: number;
  /** Who sees the next roll */
  visibility: Visibility;
  diceRollPressTime: number | null;
  changeDiceSet: (diceSet: DiceSet) => void;
  /** Change the look of a slot of custom dice */
  changeLook: (slot: number, update: Partial<DiceLook>) => void;
  resetPool: () => void;
  /** Add dice to the pool, a negative count removes them */
  addToPool: (count: number) => void;
  /** Switch to the next kind of visibility, the GM has no use for rolls only the GM sees */
  cycleVisibility: (gm?: boolean) => void;
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

/** What a slot of custom dice starts from */
export function getDefaultLook(slot: number): DiceLook {
  return slot === 1 ? SECOND_LOOK : DEFAULT_LOOK;
}

/** Restore the custom dice the player put together last time */
function loadLooks(): DiceLook[] {
  return DICE_LOOK_STORAGE_KEYS.map((key, slot) => {
    const fallback = getDefaultLook(slot);
    try {
      return sanitizeLook(
        JSON.parse(localStorage.getItem(key) || "{}"),
        LOOK_ASSETS,
        fallback
      );
    } catch {
      return sanitizeLook(undefined, LOOK_ASSETS, fallback);
    }
  });
}

function saveLook(slot: number, look: DiceLook) {
  try {
    localStorage.setItem(DICE_LOOK_STORAGE_KEYS[slot], JSON.stringify(look));
  } catch {
    // Storage can be unavailable, the look just won't be remembered
  }
}

export const useDiceControlsStore = create<DiceControlsState>()(
  immer((set, get) => ({
    diceSet: loadDiceSet(),
    looks: loadLooks(),
    pool: 0,
    visibility: "ALL",
    diceRollPressTime: null,
    changeDiceSet(diceSet) {
      saveDiceSet(diceSet);
      set((state) => {
        state.diceSet = diceSet;
      });
    },
    changeLook(slot, update) {
      const current = get().looks[slot];
      if (!current) {
        return;
      }
      const look = sanitizeLook(
        { ...current, ...update },
        LOOK_ASSETS,
        current
      );
      saveLook(slot, look);
      set((state) => {
        state.looks[slot] = look;
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
    cycleVisibility(gm) {
      set((state) => {
        const choices = gm
          ? VISIBILITIES.filter((visibility) => visibility !== "GM")
          : VISIBILITIES;
        const index = choices.indexOf(state.visibility);
        state.visibility = choices[(index + 1) % choices.length];
      });
    },
    setDiceRollPressTime(time) {
      set((state) => {
        state.diceRollPressTime = time;
      });
    },
  }))
);

/** If the dice of a set are the custom dice of the player */
export function isCustomDiceSet(diceSet: DiceSet) {
  return diceSet.dice[0].style === "CUSTOM";
}

/** Which of the slots of custom dice a set is, 0 for a set that isn't one */
export function getCustomSlot(diceSet: DiceSet) {
  return diceSet.id.startsWith("CUSTOM2") ? 1 : 0;
}

/** The look custom dice of the set that is picked have */
export function getCurrentLook(state: DiceControlsState): DiceLook {
  return state.looks[getCustomSlot(state.diceSet)];
}

/** Generate new dice for a pool using the die of the given set */
export function getDiceToRoll(pool: number, diceSet: DiceSet): Die[] {
  const { style, type } = diceSet.dice[0];
  const dice: Die[] = [];
  for (let i = 0; i < pool; i++) {
    dice.push({ id: generateDiceId(), style, type });
  }
  return dice;
}
