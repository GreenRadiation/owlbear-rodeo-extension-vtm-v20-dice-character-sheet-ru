import create from "zustand";
import { immer } from "zustand/middleware/immer";
import { diceSets } from "../sets/diceSets";
import { DiceSet } from "../types/DiceSet";
import { Die } from "../types/Die";
import { generateDiceId } from "../helpers/generateDiceId";
import { getPluginId } from "../plugin/getPluginId";
import { DiceLook, sanitizeLook } from "../dice/look";
import { ICON_IDS } from "../materials/custom/icons";

/** Who sees a roll: everyone, only the GM or no one but the player who rolls */
export type Visibility = "ALL" | "GM" | "NONE";
const VISIBILITIES: Visibility[] = ["ALL", "GM", "NONE"];

/** The most dice that can be rolled at once */
export const MAX_POOL = 16;

const DICE_SET_STORAGE_KEY = getPluginId("dice-set");
const DICE_LOOK_STORAGE_KEY = getPluginId("dice-look");

interface DiceControlsState {
  diceSet: DiceSet;
  /** The look of the custom dice of the player, used when the set of custom dice is picked */
  look: DiceLook;
  /** How many dice will be rolled */
  pool: number;
  /** Who sees the next roll */
  visibility: Visibility;
  diceRollPressTime: number | null;
  changeDiceSet: (diceSet: DiceSet) => void;
  changeLook: (update: Partial<DiceLook>) => void;
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

/** Restore the custom dice the player put together last time */
function loadLook(): DiceLook {
  try {
    return sanitizeLook(
      JSON.parse(localStorage.getItem(DICE_LOOK_STORAGE_KEY) || "{}"),
      ICON_IDS
    );
  } catch {
    return sanitizeLook(undefined, ICON_IDS);
  }
}

function saveLook(look: DiceLook) {
  try {
    localStorage.setItem(DICE_LOOK_STORAGE_KEY, JSON.stringify(look));
  } catch {
    // Storage can be unavailable, the look just won't be remembered
  }
}

export const useDiceControlsStore = create<DiceControlsState>()(
  immer((set, get) => ({
    diceSet: loadDiceSet(),
    look: loadLook(),
    pool: 0,
    visibility: "ALL",
    diceRollPressTime: null,
    changeDiceSet(diceSet) {
      saveDiceSet(diceSet);
      set((state) => {
        state.diceSet = diceSet;
      });
    },
    changeLook(update) {
      const look = sanitizeLook({ ...get().look, ...update }, ICON_IDS);
      saveLook(look);
      set((state) => {
        state.look = look;
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

/** Generate new dice for a pool using the die of the given set */
export function getDiceToRoll(pool: number, diceSet: DiceSet): Die[] {
  const { style, type } = diceSet.dice[0];
  const dice: Die[] = [];
  for (let i = 0; i < pool; i++) {
    dice.push({ id: generateDiceId(), style, type });
  }
  return dice;
}
