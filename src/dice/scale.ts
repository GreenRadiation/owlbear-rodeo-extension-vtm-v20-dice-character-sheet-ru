import { createContext, useContext } from "react";

/**
 * Size of the dice relative to the dice of the original Owlbear Rodeo roller.
 * Smaller dice leave more room in the tray for big pools but are harder to read.
 * Every player picks their own size in the settings. The size is a part of a
 * roll (`DiceRoll.scale`) because the meshes and the colliders have to use the
 * same scale for everyone who simulates that roll.
 */
export const DiceScaleContext = createContext(1);

export function useDiceScale() {
  return useContext(DiceScaleContext);
}
