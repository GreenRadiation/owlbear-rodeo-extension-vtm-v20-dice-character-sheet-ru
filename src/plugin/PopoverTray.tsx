import { Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Player } from "@owlbear-rodeo/sdk";
import { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import Paper from "@mui/material/Paper";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";

import CloseIcon from "@mui/icons-material/CloseRounded";

import environment from "../environment.hdr";
import { usePlayerDice } from "./usePlayerDice";
import { PlayerDiceRoll } from "./PlayerDiceRoll";
import { AudioListenerProvider } from "../audio/AudioListenerProvider";
import { Tray } from "../tray/Tray";
import { TraySuspense } from "../tray/TraySuspense";
import { TrayCamera } from "../tray/TrayCamera";
import { DiceRoll } from "../dice/DiceRoll";
import { DiceRoll as DiceRollType } from "../types/DiceRoll";
import { DiceThrow } from "../types/DiceThrow";
import { DiceTransform } from "../types/DiceTransform";
import { RollOutcome, formatOutcome } from "../v20/roll";
import {
  DEFAULT_TRAY_MODEL_WIDTH,
  getModelPixelWidth,
  useSymbols,
} from "../settings/store";

/** Height of the bar with the name of the player under the tray */
export const PREVIEW_NAME_HEIGHT = 32;

/** The last finished roll of a player, kept after the player clears their tray */
interface FinishedRoll {
  roll: DiceRollType;
  rollThrows: Record<string, DiceThrow>;
  transforms: Record<string, DiceTransform>;
  outcome: RollOutcome;
}

/**
 * Small tray with the roll of another player.
 * Appears when the player rolls and stays with the result until it is closed.
 */
export function PopoverTray({
  player,
  height,
  suppressed,
  onToggle,
  onOpen,
  onRollStart,
}: {
  player: Player;
  /** Height of the tray in pixels */
  height: number;
  /** Keep track of the rolls of the player without showing the preview */
  suppressed?: boolean;
  /** Tell how wide the preview is in pixels, 0 when it isn't shown */
  onToggle: (connectionId: string, width: number) => void;
  onOpen: (connectionId: string) => void;
  /** Tell that the player has started a roll */
  onRollStart: (connectionId: string) => void;
}) {
  const { diceRoll, rollThrows, outcome, finishedRolling, finishedRollTransforms } =
    usePlayerDice(player);

  const theme = useTheme();
  const symbols = useSymbols();

  // A roll the player has in their tray and lets everyone see
  const live = Boolean(diceRoll && !diceRoll.hidden);
  const rolling = live && !finishedRolling;

  const [finished, setFinished] = useState<FinishedRoll | null>(null);
  useEffect(() => {
    if (
      live &&
      diceRoll &&
      rollThrows &&
      finishedRolling &&
      finishedRollTransforms &&
      outcome
    ) {
      setFinished({
        roll: diceRoll,
        rollThrows,
        transforms: finishedRollTransforms,
        outcome,
      });
    }
  }, [
    live,
    diceRoll,
    rollThrows,
    finishedRolling,
    finishedRollTransforms,
    outcome,
  ]);

  // Closing hides the preview until the next roll of the player
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (rolling) {
      setClosed(false);
      onRollStart(player.connectionId);
    }
  }, [rolling, player.connectionId]);

  const shown = !suppressed && !closed && (rolling || finished !== null);

  // The tray is as wide as it was for the roll it shows
  const shownRoll = live ? diceRoll : finished?.roll;
  const trayWidth = shownRoll?.tray || DEFAULT_TRAY_MODEL_WIDTH;
  const width = getModelPixelWidth(height, trayWidth);

  useEffect(() => {
    onToggle(player.connectionId, shown ? width : 0);
  }, [shown, width, player.connectionId]);
  useEffect(() => {
    return () => onToggle(player.connectionId, 0);
  }, [player.connectionId]);

  if (!shown) {
    return null;
  }

  const shownOutcome = live ? outcome : finished?.outcome;

  return (
    <Paper
      elevation={8}
      sx={{
        position: "relative",
        width: `${width}px`,
        height: `${height + PREVIEW_NAME_HEIGHT}px`,
        borderRadius: 2,
        overflow: "hidden",
        flexShrink: 0,
        backgroundColor:
          theme.palette.mode === "dark"
            ? "rgba(34, 38, 57, 0.8)"
            : "rgba(255, 255, 255, 0.4)",
      }}
    >
      <ButtonBase
        aria-label={`открыть лоток игрока ${player.name}`}
        onClick={() => onOpen(player.connectionId)}
        sx={{ display: "block", width: "100%", height: "100%" }}
      >
        <Box component="div" height={`${height}px`} width={`${width}px`}>
          <TraySuspense>
            <Canvas frameloop="demand">
              <AudioListenerProvider volume={0.25}>
                <Environment files={environment} />
                <Tray widthScale={trayWidth} />
                {live ? (
                  <PlayerDiceRoll player={player} />
                ) : (
                  finished && (
                    <DiceRoll
                      roll={finished.roll}
                      rollThrows={finished.rollThrows}
                      finishedTransforms={finished.transforms}
                    />
                  )
                )}
                {/* The same view from above as the main tray so nothing is cut off. */}
                {/* A tray that lies on its side for its player is upright here */}
                <TrayCamera trayWidth={trayWidth} />
              </AudioListenerProvider>
            </Canvas>
          </TraySuspense>
        </Box>
        <Typography
          variant="subtitle1"
          color="text.secondary"
          textAlign="center"
          lineHeight={`${PREVIEW_NAME_HEIGHT}px`}
          px={0.5}
          sx={{
            bgcolor: "background.default",
          }}
          noWrap
        >
          {player.name}
          {shownOutcome && (
            <span> | {formatOutcome(shownOutcome, symbols)}</span>
          )}
        </Typography>
      </ButtonBase>
      <IconButton
        aria-label="закрыть"
        size="small"
        onClick={() => setClosed(true)}
        sx={{
          position: "absolute",
          top: 2,
          right: 2,
          color: "white",
          backgroundColor: "rgba(0, 0, 0, 0.35)",
          ":hover": { backgroundColor: "rgba(0, 0, 0, 0.6)" },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Paper>
  );
}
