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

/** The history of the player using the extension, has to be rendered when the plugin is ready */
export function OwnRollHistoryButton() {
  return <RollHistoryButton playerId={OBR.player.id} />;
}

/** Button that shows the last rolls of a player, newest first */
export function RollHistoryButton({
  playerId,
  color,
}: {
  playerId: string;
  color?: string;
}) {
  const metadata = useRoomMetadata();
  const rolls = useMemo(
    () => decodeHistory(metadata[getHistoryKey(playerId)]).reverse(),
    [metadata, playerId]
  );

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
        anchorOrigin={{ vertical: "center", horizontal: "right" }}
        transformOrigin={{ vertical: "center", horizontal: "left" }}
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
              {values.map(formatValue).join(" ")}
            </Typography>
          ))}
        </Stack>
      </Popover>
    </>
  );
}
