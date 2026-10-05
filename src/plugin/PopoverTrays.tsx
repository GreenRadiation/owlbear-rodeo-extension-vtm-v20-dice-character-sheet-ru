import OBR, { Player } from "@owlbear-rodeo/sdk";
import { useEffect, useState } from "react";

import Stack from "@mui/material/Stack";

import { PREVIEW_NAME_HEIGHT, PopoverTray } from "./PopoverTray";
import { getPluginId } from "./getPluginId";
import { useSettingsStore } from "../settings/store";

/** Space around and between the previews in pixels */
const PREVIEW_GAP = 8;
const PREVIEW_MARGIN = 16;

/** Previews of the rolls of the other players in the corner of the screen */
export function PopoverTrays() {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    OBR.party.getPlayers().then(setPlayers);
  }, []);
  useEffect(() => OBR.party.onChange(setPlayers), []);

  const height = useSettingsStore((state) => state.settings.previewHeight);
  const enabled = height > 0;

  /** Widths in pixels of the previews that are shown by the connection id of their player */
  const [widths, setWidths] = useState<Record<string, number>>({});

  function handleTrayToggle(connectionId: string, width: number) {
    setWidths((widths) => {
      if ((widths[connectionId] || 0) === width) {
        return widths;
      }
      const next = { ...widths };
      if (width > 0) {
        next[connectionId] = width;
      } else {
        delete next[connectionId];
      }
      return next;
    });
  }

  function handleTrayOpen(connectionId: string) {
    if (window.BroadcastChannel) {
      OBR.action.open();
      const channel = new BroadcastChannel(getPluginId("focused-tray"));
      channel.postMessage(connectionId);
      channel.close();
    }
  }

  // Fit the window to the previews, an empty window is hidden
  const shownWidths = enabled ? Object.values(widths) : [];
  const count = shownWidths.length;
  const totalWidth = shownWidths.reduce((a, b) => a + b, 0);
  useEffect(() => {
    const id = getPluginId("popover");
    if (count === 0) {
      OBR.popover.setHeight(id, 0);
      OBR.popover.setWidth(id, 0);
    } else {
      OBR.popover.setHeight(
        id,
        height + PREVIEW_NAME_HEIGHT + PREVIEW_MARGIN * 2
      );
      OBR.popover.setWidth(
        id,
        totalWidth + (count - 1) * PREVIEW_GAP + PREVIEW_MARGIN * 2
      );
    }
  }, [count, totalWidth, height]);

  if (!enabled) {
    return null;
  }

  return (
    <Stack
      direction="row-reverse"
      alignItems="flex-end"
      gap={`${PREVIEW_GAP}px`}
      sx={{
        position: "absolute",
        right: PREVIEW_MARGIN,
        bottom: PREVIEW_MARGIN,
      }}
    >
      {players.map((player) => (
        <PopoverTray
          key={player.connectionId}
          player={player}
          height={height}
          onToggle={handleTrayToggle}
          onOpen={handleTrayOpen}
        />
      ))}
    </Stack>
  );
}
