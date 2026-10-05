import OBR from "@owlbear-rodeo/sdk";
import { useMemo, useState } from "react";

import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import HistoryIcon from "@mui/icons-material/HistoryRounded";

import { getHistoryKey } from "./RollHistorySync";
import { useRoomMetadata } from "./roomStorage";
import { decodeHistory } from "../v20/history";
import { formatValue } from "../v20/roll";
import { useSettingsStore, useSymbols } from "../settings/store";

/** The history of the player using the extension, has to be rendered when the plugin is ready */
export function OwnRollHistoryButton() {
  return <RollHistoryButton playerId={OBR.player.id} color="white" />;
}

/**
 * Button that shows the last rolls of a player, newest first.
 * Sits in the bottom left corner of a tray so the list opens upwards.
 */
export function RollHistoryButton({
  playerId,
  color,
}: {
  playerId: string;
  color?: string;
}) {
  const metadata = useRoomMetadata();
  // The room keeps more rolls than a player may want to see
  const length = useSettingsStore((state) => state.settings.historyLength);
  const rolls = useMemo(
    () =>
      decodeHistory(metadata[getHistoryKey(playerId)])
        .reverse()
        .slice(0, length),
    [metadata, playerId, length]
  );

  const symbols = useSymbols();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <>
      <Tooltip title="История бросков" placement="top" disableInteractive>
        <IconButton
          aria-label="история бросков"
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{ color, pointerEvents: "all" }}
        >
          <HistoryIcon />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        marginThreshold={8}
      >
        <Stack px={1.5} py={1} maxHeight="80vh" overflow="auto">
          {rolls.length === 0 && (
            <Typography color="text.secondary">Бросков пока нет</Typography>
          )}
          {rolls.map((values, index) => (
            <Typography
              key={rolls.length - index}
              // The newest roll stands out, older rolls fade a little
              color={index === 0 ? "text.primary" : "text.secondary"}
              noWrap
            >
              {values.map((value) => formatValue(value, symbols)).join(" ")}
            </Typography>
          ))}
        </Stack>
      </Popover>
    </>
  );
}
