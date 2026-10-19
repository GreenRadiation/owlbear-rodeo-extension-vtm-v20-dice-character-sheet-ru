import { Die } from "../types/Die";
import { WeightClass } from "../types/WeightClass";

/** How heavy a die sounds: iron dice are heavy, the rest medium (the light D4 of the original roller is gone) */
export function getDieWeightClass(die: Die): WeightClass {
  return die.style === "IRON" ? "HEAVY" : "MEDIUM";
}
