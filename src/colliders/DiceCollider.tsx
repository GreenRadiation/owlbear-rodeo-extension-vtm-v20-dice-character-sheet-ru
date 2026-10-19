import { DiceType } from "../types/DiceType";
import { D10Collider } from "./D10Collider";

/** V20 only rolls D10, the colliders of the other dice of the original roller were removed */
export function DiceCollider({ diceType }: { diceType: DiceType }) {
  if (diceType !== "D10") {
    throw Error(`Dice type ${diceType} error: not implemented`);
  }
  return <D10Collider />;
}
