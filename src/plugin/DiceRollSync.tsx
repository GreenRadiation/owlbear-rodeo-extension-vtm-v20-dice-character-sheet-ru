import OBR from "@owlbear-rodeo/sdk";
import { useEffect, useRef } from "react";
import { useDiceRollStore } from "../dice/store";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { getPluginId } from "./getPluginId";

/** Sync the current dice roll to the plugin */
export function DiceRollSync() {
  const prevIds = useRef<string[]>([]);
  useEffect(
    () =>
      useDiceRollStore.subscribe((state) => {
        let changed = false;
        if (!state.roll) {
          changed = true;
          prevIds.current = [];
        } else {
          const ids = getDieFromDice(state.roll).map((die) => die.id);
          // Check array length for early change check
          if (prevIds.current.length !== ids.length) {
            changed = true;
          }
          // Check the ids have changed
          else if (!ids.every((id, index) => id === prevIds.current[index])) {
            changed = true;
          }
          // Check if we'e completed a roll
          else if (
            Object.values(state.rollValues).every((value) => value !== null)
          ) {
            changed = true;
          }
          prevIds.current = ids;
        }

        if (changed) {
          // Don't share the dice of a hidden roll unless the GM is allowed to see it.
          // Everyone receives a roll that is only for the GM, their extension doesn't show it
          const secret = Boolean(state.roll?.hidden && !state.roll.gm);
          const throws = secret ? undefined : state.rollThrows;
          const values = secret ? undefined : state.rollValues;
          const transforms = secret ? undefined : state.rollTransforms;
          OBR.player.setMetadata({
            [getPluginId("roll")]: state.roll,
            [getPluginId("rollThrows")]: throws,
            [getPluginId("rollValues")]: values,
            [getPluginId("rollTransforms")]: transforms,
            [getPluginId("difficulty")]: state.difficulty,
            [getPluginId("specialty")]: state.specialty,
          });
        }
      }),
    []
  );

  return null;
}
