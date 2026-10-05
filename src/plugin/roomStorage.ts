import OBR, { Metadata } from "@owlbear-rodeo/sdk";
import { useEffect, useState } from "react";

/**
 * The metadata of a room is limited to 16000 bytes of UTF-8 JSON for all
 * the extensions of the room together.
 * A write over the limit is dropped without an error (measured, see CLAUDE.md)
 * so the size has to be checked before writing.
 */
export const ROOM_METADATA_LIMIT = 16000;
/** Bytes left alone for other extensions and for writes that happen at the same time */
const ROOM_METADATA_RESERVE = 1000;

/** Size of a value in the room metadata in bytes */
export function byteSize(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value) ?? "").length;
}

/** True if the room metadata still fits in the limit after applying an update */
export function fitsInRoom(metadata: Metadata, update: Metadata): boolean {
  const next = { ...metadata, ...update };
  for (const [key, value] of Object.entries(update)) {
    if (value === undefined) {
      delete next[key];
    }
  }
  return byteSize(next) <= ROOM_METADATA_LIMIT - ROOM_METADATA_RESERVE;
}

/** The metadata of the room kept up to date, empty until it loads */
export function useRoomMetadata(): Metadata {
  const [metadata, setMetadata] = useState<Metadata>({});

  useEffect(() => {
    let mounted = true;
    OBR.room.getMetadata().then((value) => {
      if (mounted) {
        setMetadata(value);
      }
    });
    const unsubscribe = OBR.room.onMetadataChange(setMetadata);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return metadata;
}
