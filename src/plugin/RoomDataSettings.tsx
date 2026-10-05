import OBR, { Player } from "@owlbear-rodeo/sdk";
import { useEffect, useMemo, useState } from "react";

import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";

import { getPluginId } from "./getPluginId";
import { ROOM_METADATA_LIMIT, byteSize, useRoomMetadata } from "./roomStorage";

const HISTORY_PREFIX = getPluginId("history/");

/**
 * What the extension keeps in the room for every player and how much space it takes.
 * The room has very little space (see roomStorage) and the data of players
 * who are gone, like test accounts, stays until someone deletes it.
 * A player can delete their own data, the GM can delete anyone's.
 */
export function RoomDataSettings() {
  const metadata = useRoomMetadata();

  const [players, setPlayers] = useState<Player[]>([]);
  const [role, setRole] = useState<"GM" | "PLAYER">("PLAYER");
  const [name, setName] = useState("");
  useEffect(() => {
    OBR.party.getPlayers().then(setPlayers);
    OBR.player.getRole().then(setRole);
    OBR.player.getName().then(setName);
    return OBR.party.onChange(setPlayers);
  }, []);

  const entries = useMemo(() => {
    const names: Record<string, string> = { [OBR.player.id]: name };
    for (const player of players) {
      names[player.id] = player.name;
    }
    return Object.entries(metadata)
      .filter(([key]) => key.startsWith(HISTORY_PREFIX))
      .map(([key, value]) => {
        const playerId = key.slice(HISTORY_PREFIX.length);
        return {
          key,
          own: playerId === OBR.player.id,
          name: names[playerId] || "игрок не в сети",
          size: byteSize({ [key]: value }),
        };
      });
  }, [metadata, players, name]);

  const total = useMemo(() => byteSize(metadata), [metadata]);

  return (
    <Stack gap={0.5}>
      <Stack direction="row" justifyContent="space-between" gap={1}>
        <Typography>Память комнаты</Typography>
        <Typography color="text.secondary" noWrap>
          {total} из {ROOM_METADATA_LIMIT} байт
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Общая на все расширения комнаты. Свои данные может удалить каждый,
        чужие только мастер.
      </Typography>
      {entries.map((entry) => (
        <Stack
          key={entry.key}
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
        >
          <Typography noWrap>История: {entry.name}</Typography>
          <Stack direction="row" alignItems="center" flexShrink={0}>
            <Typography color="text.secondary" noWrap>
              {entry.size} байт
            </Typography>
            <Tooltip title="Удалить" disableInteractive>
              <span>
                <IconButton
                  size="small"
                  aria-label={`удалить историю: ${entry.name}`}
                  disabled={!entry.own && role !== "GM"}
                  onClick={() =>
                    OBR.room.setMetadata({ [entry.key]: undefined })
                  }
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
