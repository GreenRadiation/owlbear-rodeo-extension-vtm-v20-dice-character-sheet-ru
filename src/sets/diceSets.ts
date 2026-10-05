import { DiceSet } from "../types/DiceSet";
import { DiceStyle, ImageDiceStyle } from "../types/DiceStyle";

import * as galaxyPreviews from "../previews/galaxy";
import * as gemstonePreviews from "../previews/gemstone";
import * as glassPreviews from "../previews/glass";
import * as ironPreviews from "../previews/iron";
import * as nebulaPreviews from "../previews/nebula";
import * as sunrisePreviews from "../previews/sunrise";
import * as sunsetPreviews from "../previews/sunset";
import * as walnutPreviews from "../previews/walnut";

const previews: Record<ImageDiceStyle, string> = {
  GALAXY: galaxyPreviews.D10,
  GEMSTONE: gemstonePreviews.D10,
  GLASS: glassPreviews.D10,
  IRON: ironPreviews.D10,
  NEBULA: nebulaPreviews.D10,
  SUNRISE: sunrisePreviews.D10,
  SUNSET: sunsetPreviews.D10,
  WALNUT: walnutPreviews.D10,
};

/** V20 only uses pools of D10 so every set is a single D10 of a given style */
function createSet(style: DiceStyle): DiceSet {
  const id = `${style}_STANDARD`;
  return {
    id,
    name: `${style.toLowerCase()} dice`,
    dice: [{ id: `${id}_D10`, type: "D10", style }],
    // Custom dice have no image, they are drawn from their look
    previewImage: style === "CUSTOM" ? "" : previews[style],
  };
}

/** The first set is the default one: red dice */
export const diceSets: DiceSet[] = [
  createSet("SUNSET"),
  createSet("GALAXY"),
  createSet("GEMSTONE"),
  createSet("GLASS"),
  createSet("IRON"),
  createSet("NEBULA"),
  createSet("SUNRISE"),
  createSet("WALNUT"),
  // Two slots of custom dice, see `getCustomSlot` in controls/store.ts
  createSet("CUSTOM"),
  {
    ...createSet("CUSTOM"),
    id: "CUSTOM2_STANDARD",
    name: "custom dice 2",
    dice: [{ id: "CUSTOM2_STANDARD_D10", type: "D10", style: "CUSTOM" }],
  },
];
