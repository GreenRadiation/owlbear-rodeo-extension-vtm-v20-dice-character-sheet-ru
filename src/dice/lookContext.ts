import { createContext, useContext, useMemo } from "react";

import { ICON_IDS } from "../materials/custom/icons";
import { DiceLook, sanitizeLook } from "./look";

/**
 * The look of the custom dice that are being drawn.
 * Like the size of the dice it is a part of a roll (`DiceRoll.look`) and
 * reaches the materials through a context that `DiceRoll` sets.
 * The value is whatever came with the roll: it isn't trusted.
 */
export const DiceLookContext = createContext<unknown>(undefined);

/** The look custom dice have to be drawn with, always a valid one */
export function useDiceLook(): DiceLook {
  const look = useContext(DiceLookContext);
  return useMemo(() => sanitizeLook(look, ICON_IDS), [look]);
}
