import OBR from "@owlbear-rodeo/sdk";
import { useMemo, useState } from "react";

import ButtonBase from "@mui/material/ButtonBase";
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
 * A roll reads as what was rolled, "Сила + Атлетика + 2d10"; a click on
 * the line swaps that for the values of the dice and back. Rolls recorded
 * without a label show the values.
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
  // Lines showing their values instead of their label, by position from the newest
  const [flipped, setFlipped] = useState<Set<number>>(new Set());

  function flip(index: number) {
    setFlipped((flipped) => {
      const next = new Set(flipped);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

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
        onClose={() => {
          setAnchorEl(null);
          setFlipped(new Set());
        }}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        marginThreshold={8}
      >
        <Stack px={1.5} py={1} maxHeight="80vh" maxWidth={320} overflow="auto">
          {rolls.length === 0 && (
            <Typography color="text.secondary">Бросков пока нет</Typography>
          )}
          {rolls.map((roll, index) => {
            const values = roll.values
              .map((value) => formatValue(value, symbols))
              .join(" ");
            const showValues = !roll.label || flipped.has(index);
            return (
              <ButtonBase
                key={rolls.length - index}
                onClick={() => roll.label && flip(index)}
                disabled={!roll.label}
                sx={{
                  justifyContent: "flex-start",
                  textAlign: "left",
                  borderRadius: 1,
                  px: 0.5,
                  mx: -0.5,
                  maxWidth: "100%",
                }}
              >
                <Typography
                  // The newest roll stands out, older rolls fade a little
                  color={index === 0 ? "text.primary" : "text.secondary"}
                  noWrap
                  width="100%"
                >
                  {showValues ? values : roll.label}
                </Typography>
              </ButtonBase>
            );
          })}
        </Stack>
      </Popover>
    </>
  );
}
