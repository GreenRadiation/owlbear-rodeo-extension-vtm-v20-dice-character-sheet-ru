import OBR from "@owlbear-rodeo/sdk";
import { useEffect } from "react";

import { useDiceRollStore } from "../dice/store";
import { getPluginId } from "./getPluginId";
import { fitsInRoom } from "./roomStorage";
import { faceToValue } from "../v20/roll";
import { decodeHistory, pushRoll } from "../v20/history";

/** Every player writes their history to their own key so that players never overwrite each other */
export function getHistoryKey(playerId: string) {
  return getPluginId(`history/${playerId}`);
}

async function recordRoll(values: number[]) {
  const key = getHistoryKey(OBR.player.id);
  const metadata = await OBR.room.getMetadata();
  let history = pushRoll(metadata[key], values);
  // Keep fewer rolls if the room is running out of space
  while (!fitsInRoom(metadata, { [key]: history })) {
    const rolls = decodeHistory(history).length;
    if (rolls <= 1) {
      console.warn("No space left in the room metadata for the roll history");
      return;
    }
    history = pushRoll(metadata[key], values, Math.floor(rolls / 2));
  }
  await OBR.room.setMetadata({ [key]: history });
}

/** Record the finished rolls of this player to the room so everyone can look them up */
export function RollHistorySync() {
  useEffect(() => {
    // The dice of the last recorded roll, a reroll changes the ids of the dice
    let recorded = "";
    return useDiceRollStore.subscribe((state) => {
      if (!state.roll) {
        recorded = "";
        return;
      }
      const entries = Object.entries(state.rollValues);
      if (
        state.roll.hidden ||
        entries.length === 0 ||
        entries.some(([_, value]) => value === null)
      ) {
        return;
      }
      const signature = entries
        .map(([id]) => id)
        .sort()
        .join(",");
      if (signature === recorded) {
        return;
      }
      recorded = signature;
      const values = entries.map(([_, value]) => faceToValue(value as number));
      recordRoll(values).catch((error) => console.error(error));
    });
  }, []);

  return null;
}
