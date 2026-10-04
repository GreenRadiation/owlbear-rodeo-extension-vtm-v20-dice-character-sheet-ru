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

  const [visibleTrays, setVisibleTrays] = useState<string[]>([]);

  useEffect(() => {
    const playerIds = players.map((p) => p.connectionId);
    setVisibleTrays((visible) =>
      visible.filter((id) => playerIds.includes(id))
    );
  }, [players]);

  function handleTrayToggle(connectionId: string, shown: boolean) {
    if (shown) {
      setVisibleTrays((visible) =>
        visible.includes(connectionId) ? visible : [...visible, connectionId]
      );
    } else {
      setVisibleTrays((visible) => visible.filter((id) => id !== connectionId));
    }
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
  const count = enabled ? visibleTrays.length : 0;
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
        count * (height / 2) + (count - 1) * PREVIEW_GAP + PREVIEW_MARGIN * 2
      );
    }
  }, [count, height]);

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
