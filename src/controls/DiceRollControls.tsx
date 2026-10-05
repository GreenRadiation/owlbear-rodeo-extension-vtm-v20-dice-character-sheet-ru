import { useEffect, useMemo, useRef, useState } from "react";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Fade from "@mui/material/Fade";
import { useTheme, keyframes } from "@mui/material/styles";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";

import CloseIcon from "@mui/icons-material/CloseRounded";
import HiddenIcon from "@mui/icons-material/VisibilityOffRounded";
import GmIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import RollIcon from "@mui/icons-material/ArrowForwardRounded";

import { RerollDiceIcon } from "../icons/RerollDiceIcon";

import { GradientOverlay } from "./GradientOverlay";
import { useDiceRollStore } from "../dice/store";
import { RollResult, WIDE_RESULT_WIDTH } from "./RollResult";
import { getDiceToRoll, isCustomDiceSet, useDiceControlsStore } from "./store";
import { faceToValue } from "../v20/roll";
import {
  getTrayMode,
  getTrayModelWidth,
  useSettingsStore,
} from "../settings/store";

const jiggle = keyframes`
0% { transform: translate(0, 0) rotate(0deg); }
25% { transform: translate(2px, 2px) rotate(2deg); }
50% { transform: translate(0, 0) rotate(0deg); }
75% { transform: translate(-2px, 2px) rotate(-2deg); }
100% { transform: translate(0, 0) rotate(0deg); }
`;

export function DiceRollControls() {
  const pool = useDiceControlsStore((state) => state.pool);

  const rollValues = useDiceRollStore((state) => state.rollValues);
  const finishedRolling = useMemo(() => {
    const values = Object.values(rollValues);
    if (values.length === 0) {
      return false;
    } else {
      return values.every((value) => value !== null);
    }
  }, [rollValues]);

  if (pool > 0) {
    return (
      <Fade in>
        <span>
          <DicePickedControls />
        </span>
      </Fade>
    );
  } else if (finishedRolling) {
    return (
      <Fade in>
        <span>
          <FinishedRollControls />
        </span>
      </Fade>
    );
  } else {
    return null;
  }
}

function DicePickedControls() {
  const startRoll = useDiceRollStore((state) => state.startRoll);

  const pool = useDiceControlsStore((state) => state.pool);
  const diceSet = useDiceControlsStore((state) => state.diceSet);
  const visibility = useDiceControlsStore((state) => state.visibility);
  const resetPool = useDiceControlsStore((state) => state.resetPool);

  function handleRoll() {
    if (pool > 0 && rollPressTime) {
      const dice = getDiceToRoll(pool, diceSet);
      const activeTimeSeconds = (performance.now() - rollPressTime) / 1000;
      const speedMultiplier = Math.max(1, Math.min(10, activeTimeSeconds * 2));
      const mode = getTrayMode(useSettingsStore.getState().settings);
      startRoll(
        {
          dice,
          hidden: visibility !== "ALL",
          gm: visibility === "GM",
          scale: mode.diceScale,
          tray: getTrayModelWidth(mode.width),
          look: isCustomDiceSet(diceSet)
            ? useDiceControlsStore.getState().look
            : undefined,
        },
        speedMultiplier
      );
      resetPool();
    }
    setRollPressTime(null);
  }

  const rollPressTime = useDiceControlsStore(
    (state) => state.diceRollPressTime
  );
  const setRollPressTime = useDiceControlsStore(
    (state) => state.setDiceRollPressTime
  );

  function handlePointerDown() {
    setRollPressTime(performance.now());
  }

  useEffect(() => {
    if (rollPressTime) {
      const handlePointerUp = () => {
        setRollPressTime(null);
      };
      window.addEventListener("pointerup", handlePointerUp);
      return () => {
        window.removeEventListener("pointerup", handlePointerUp);
      };
    }
  }, [rollPressTime]);

  const theme = useTheme();

  return (
    <>
      <ButtonBase
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          cursor: "pointer",
          backgroundColor: "rgba(0, 0, 0, 0.25)",
          ":focus": {
            outline: 0,
          },
          ":hover #dice-roll-button": {
            color: theme.palette.primary.contrastText,
            width: "116px",
            "& span": {
              transform: "translateX(0)",
            },
            backgroundColor: theme.palette.primary.main,
          },
          ":active #dice-roll-button": {
            backgroundColor: theme.palette.primary.dark,
          },
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handleRoll}
        aria-label="бросок"
      >
        <Box
          component="div"
          sx={{
            ":active": {
              animation: `${jiggle} 0.3s infinite`,
            },
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <Button
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "transparent",
              "& span": {
                transform: "translate(-31px)",
                color: theme.palette.primary.contrastText,
                transition: theme.transitions.create("transform"),
              },
              transition: theme.transitions.create([
                "width",
                "color",
                "background-color",
              ]),
              minWidth: 0,
              width: "36px",
              overflow: "hidden",
              borderRadius: "20px",
            }}
            endIcon={<RollIcon />}
            variant="contained"
            id="dice-roll-button"
            // @ts-ignore
            component="div"
          >
            Бросок
          </Button>
        </Box>
      </ButtonBase>
      <GradientOverlay top />
      <Stack
        sx={{
          position: "absolute",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <Tooltip title="Очистить" disableInteractive>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              resetPool();
            }}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    </>
  );
}

function FinishedRollControls() {
  const roll = useDiceRollStore((state) => state.roll);
  const clearRoll = useDiceRollStore((state) => state.clearRoll);
  const reroll = useDiceRollStore((state) => state.reroll);
  const difficulty = useDiceRollStore((state) => state.difficulty);
  const setDifficulty = useDiceRollStore((state) => state.setDifficulty);
  const specialty = useDiceRollStore((state) => state.specialty);
  const setSpecialty = useDiceRollStore((state) => state.setSpecialty);

  const rollValues = useDiceRollStore((state) => state.rollValues);
  const values = useMemo(() => {
    const values: number[] = [];
    for (const value of Object.values(rollValues)) {
      if (value !== null) {
        values.push(faceToValue(value));
      }
    }
    return values;
  }, [rollValues]);

  const [resultsExpanded, setResultsExpanded] = useState(false);

  // Measure the tray to lay out the result of the roll
  const measureRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const element = measureRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(() =>
      setWide(element.clientWidth >= WIDE_RESULT_WIDTH)
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <GradientOverlay
        top
        height={(wide ? 110 : 180) + (resultsExpanded ? 80 : 0)}
      />
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          pointerEvents: "none",
          padding: 3,
        }}
        component="div"
        ref={measureRef}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          width="100%"
          alignItems="start"
        >
          <Tooltip title="Перебросить все" sx={{ pointerEvents: "all" }}>
            <IconButton
              onClick={() => {
                // The size of the tray and the dice may have changed since the roll
                const mode = getTrayMode(useSettingsStore.getState().settings);
                reroll(undefined, undefined, {
                  scale: mode.diceScale,
                  tray: getTrayModelWidth(mode.width),
                });
              }}
              sx={{ pointerEvents: "all", color: "white" }}
            >
              <RerollDiceIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Очистить" sx={{ pointerEvents: "all" }}>
            <IconButton
              onClick={() => clearRoll()}
              sx={{ pointerEvents: "all", color: "white" }}
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Stack
        sx={{
          position: "absolute",
          top: 0,
          // A wide result takes the whole space between the buttons at the sides
          left: wide ? 64 : "50%",
          right: wide ? 64 : undefined,
          transform: wide ? undefined : "translateX(-50%)",
          pointerEvents: "none",
          py: 3,
          px: wide ? 0 : 3,
          alignItems: "center",
        }}
        component="div"
      >
        {roll && (
          <RollResult
            values={values}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            specialty={specialty}
            onSpecialtyChange={setSpecialty}
            wide={wide}
            expanded={resultsExpanded}
            onExpand={setResultsExpanded}
          />
        )}
        {roll?.hidden &&
          (roll.gm ? (
            <Tooltip title="Этот бросок видит только мастер">
              <GmIcon htmlColor="white" sx={{ pointerEvents: "all" }} />
            </Tooltip>
          ) : (
            <Tooltip title="Этот бросок не видит никто">
              <HiddenIcon htmlColor="white" sx={{ pointerEvents: "all" }} />
            </Tooltip>
          ))}
      </Stack>
    </>
  );
}
