import { Player } from "@owlbear-rodeo/sdk";
import { useEffect, useMemo, useRef } from "react";
import { DiceRoll } from "../types/DiceRoll";
import { DiceThrow } from "../types/DiceThrow";
import { DiceTransform } from "../types/DiceTransform";
import { getPluginId } from "./getPluginId";
import {
  DEFAULT_DIFFICULTY,
  clampDifficulty,
  faceToValue,
  getRollOutcome,
} from "../v20/roll";

export function usePlayerDice(player?: Player) {
  const diceRoll = useMemo(() => {
    return player?.metadata[getPluginId("roll")] as DiceRoll | undefined;
  }, [player]);

  const rollThrows = useMemo(() => {
    return player?.metadata[getPluginId("rollThrows")] as
      | Record<string, DiceThrow>
      | undefined;
  }, [player]);

  const rollValues = useMemo(() => {
    return player?.metadata[getPluginId("rollValues")] as
      | Record<string, number | null>
      | undefined;
  }, [player]);

  const rollTransforms = useMemo(() => {
    return player?.metadata[getPluginId("rollTransforms")] as
      | Record<string, DiceTransform | null>
      | undefined;
  }, [player]);

  const finishedRollTransforms = useMemo(() => {
    if (!rollTransforms) {
      return undefined;
    }
    const values: Record<string, DiceTransform> = {};
    for (const [id, value] of Object.entries(rollTransforms)) {
      if (value !== null) {
        values[id] = value;
      }
    }
    return values;
  }, [rollTransforms]);

  const transformsRef = useRef<Record<string, DiceTransform | null> | null>(
    null
  );
  useEffect(() => {
    transformsRef.current = rollTransforms || null;
  }, [rollTransforms]);

  const finishedRollValues = useMemo(() => {
    if (!rollValues) {
      return undefined;
    }
    const values: Record<string, number> = {};
    for (const [id, value] of Object.entries(rollValues)) {
      if (value !== null) {
        values[id] = value;
      }
    }
    return values;
  }, [rollValues]);

  /** The difficulty the player who rolled is counting successes against */
  const difficulty = useMemo(() => {
    const value = player?.metadata[getPluginId("difficulty")];
    return typeof value === "number"
      ? clampDifficulty(value)
      : DEFAULT_DIFFICULTY;
  }, [player]);

  /** Values of the dice that have finished rolling in the 1-10 range */
  const values = useMemo(
    () => Object.values(finishedRollValues || {}).map(faceToValue),
    [finishedRollValues]
  );

  const finishedRolling = useMemo(() => {
    if (!rollValues) {
      return false;
    }
    const values = Object.values(rollValues);
    if (values.length === 0) {
      return false;
    } else {
      return values.every((value) => value !== null);
    }
  }, [rollValues]);

  /** The result of the roll, null while the dice are rolling or hidden */
  const outcome = useMemo(
    () => (finishedRolling ? getRollOutcome(values, difficulty) : null),
    [finishedRolling, values, difficulty]
  );

  return {
    diceRoll,
    rollThrows,
    rollValues,
    rollTransforms,
    transformsRef,
    finishedRollTransforms,
    difficulty,
    values,
    outcome,
    finishedRollValues,
    finishedRolling,
  };
}
