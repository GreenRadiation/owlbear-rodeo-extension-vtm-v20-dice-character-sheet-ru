import OBR from "@owlbear-rodeo/sdk";
import { useCallback, useEffect, useRef, useState } from "react";

import { getPluginId } from "../plugin/getPluginId";
import { fitsInRoom, useRoomMetadata } from "../plugin/roomStorage";
import { decodeSheet, encodeSheet } from "./codec";
import { Sheet, createSheet } from "./model";

/** Wait this long after the last change before writing the sheet to the room */
const WRITE_DELAY = 400;

export const SHEET_PREFIX = getPluginId("sheet/");

/** Every player has one sheet stored in the room under their own key */
export function getSheetKey(playerId: string) {
  return `${SHEET_PREFIX}${playerId}`;
}

/**
 * The character sheet of a player stored in the metadata of the room.
 * Changes show up right away and are written to the room a moment later,
 * changes made by someone else (the GM or the player) are picked up.
 * Remount with a `key` to switch to the sheet of another player.
 */
export function useSheet(playerId: string) {
  const key = getSheetKey(playerId);
  const metadata = useRoomMetadata();
  const stored = metadata[key];

  const [sheet, setSheet] = useState<Sheet>(createSheet);
  /** True when the last write was refused because the room has no space left */
  const [full, setFull] = useState(false);

  /** The newest version of the sheet that hasn't been written yet */
  const pendingRef = useRef<Sheet | null>(null);
  const timeoutRef = useRef<number | undefined>(undefined);
  /** What this hook last wrote, used to tell its own writes from the writes of others */
  const writtenRef = useRef<string | null>(null);
  const metadataRef = useRef(metadata);
  metadataRef.current = metadata;

  // Follow the sheet in the room unless there are changes on their way there
  useEffect(() => {
    if (pendingRef.current || stored === writtenRef.current) {
      return;
    }
    setSheet(decodeSheet(stored) || createSheet());
  }, [stored]);

  const flush = useCallback(() => {
    window.clearTimeout(timeoutRef.current);
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending) {
      return;
    }
    const encoded = encodeSheet(pending);
    if (!fitsInRoom(metadataRef.current, { [key]: encoded })) {
      setFull(true);
      return;
    }
    setFull(false);
    writtenRef.current = encoded;
    OBR.room.setMetadata({ [key]: encoded });
  }, [key]);

  // Don't lose the last changes when the sheet is closed
  useEffect(() => flush, [flush]);

  const sheetRef = useRef(sheet);
  sheetRef.current = sheet;

  const update = useCallback(
    (change: (sheet: Sheet) => Sheet) => {
      // Several changes can come before the next render, build on the newest one
      const next = change(pendingRef.current || sheetRef.current);
      pendingRef.current = next;
      setSheet(next);
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(flush, WRITE_DELAY);
    },
    [flush]
  );

  return { sheet, update, full, exists: stored !== undefined };
}
