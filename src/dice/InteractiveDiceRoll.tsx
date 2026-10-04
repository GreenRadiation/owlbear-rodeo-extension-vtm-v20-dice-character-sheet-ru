import { useEffect, useRef } from "react";
import { DiceTransform } from "../types/DiceTransform";
import { DiceRoll } from "./DiceRoll";
import { useDiceRollStore } from "./store";

/** Dice roll based off of the values from the dice roll store */
// TODO: rename, the dice themselves are no longer interactive
export function InteractiveDiceRoll() {
  const roll = useDiceRollStore((state) => state.roll);
  const rollThrows = useDiceRollStore((state) => state.rollThrows);
  const finishDieRoll = useDiceRollStore((state) => state.finishDieRoll);

  const finishedTransforms = useDiceRollStore((state) => {
    const values = Object.values(state.rollTransforms);
    if (values.some((v) => v === null)) {
      return undefined;
    }
    return state.rollTransforms as Record<string, DiceTransform>;
  });

  const transformsRef = useRef<Record<string, DiceTransform | null> | null>(
    null
  );
  useEffect(
    () =>
      useDiceRollStore.subscribe((state) => {
        transformsRef.current = state.rollTransforms;
      }),
    []
  );

  if (!roll) {
    return null;
  }

  return (
    <DiceRoll
      roll={roll}
      rollThrows={rollThrows}
      finishedTransforms={finishedTransforms}
      onRollFinished={finishDieRoll}
      transformsRef={transformsRef}
    />
  );
}
