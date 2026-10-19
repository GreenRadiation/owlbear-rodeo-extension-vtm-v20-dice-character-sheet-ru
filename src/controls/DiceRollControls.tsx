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
import {
  getCurrentLook,
  getDiceToRoll,
  getPoolLabel,
  isCustomDiceSet,
  useDiceControlsStore,
} from "./store";
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

/** Space the buttons at the sides of the tray take, the result sits between them */
const SIDE_BUTTONS = 64;

/**
 * The controls over the tray. The difficulty and the speciality are shown
 * the same way through every stage: while the pool is picked, while the dice
 * roll and with the result. A check with a high difficulty can be set up
 * before anyone sees a result counted against the usual 6.
 */
export function DiceRollControls() {
  const pool = useDiceControlsStore((state) => state.pool);
  const roll = useDiceRollStore((state) => state.roll);

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
  } else if (roll) {
    return <RollingControls />;
  } else {
    return null;
  }
}

/** Whether the tray is wide enough for the difficulty and the speciality at the sides of the result */
function useWideTray() {
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
  return [measureRef, wide] as const;
}

/**
 * The difficulty, the speciality and the result, in the same place through
 * every stage of a roll. Before the dice land there is no result.
 */
function TrayHeader({
  wide,
  values,
  label,
  expanded,
  onExpand,
}: {
  wide: boolean;
  /** The values of the dice once they have landed */
  values?: number[];
  /** What is being rolled */
  label?: string;
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
}) {
  const difficulty = useDiceRollStore((state) => state.difficulty);
  const setDifficulty = useDiceRollStore((state) => state.setDifficulty);
  const specialty = useDiceRollStore((state) => state.specialty);
  const setSpecialty = useDiceRollStore((state) => state.setSpecialty);

  return (
    <Stack
      sx={{
        position: "absolute",
        top: 0,
        // A wide result takes the whole space between the buttons at the sides
        left: wide ? SIDE_BUTTONS : "50%",
        right: wide ? SIDE_BUTTONS : undefined,
        transform: wide ? undefined : "translateX(-50%)",
        pointerEvents: "none",
        py: 3,
        px: wide ? 0 : 3,
        alignItems: "center",
      }}
      component="div"
    >
      <RollResult
        values={values}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        specialty={specialty}
        onSpecialtyChange={setSpecialty}
        wide={wide}
        label={label}
        expanded={expanded}
        onExpand={onExpand}
      />
    </Stack>
  );
}

function DicePickedControls() {
  const startRoll = useDiceRollStore((state) => state.startRoll);

  const pool = useDiceControlsStore((state) => state.pool);
  const diceSet = useDiceControlsStore((state) => state.diceSet);
  const visibility = useDiceControlsStore((state) => state.visibility);
  const resetPool = useDiceControlsStore((state) => state.resetPool);
  const label = useDiceControlsStore(getPoolLabel);

  function handleRoll() {
    if (pool > 0 && rollPressTime) {
      const controls = useDiceControlsStore.getState();
      // The same dice as in the pool so that they keep their look
      const dice = getDiceToRoll(pool, diceSet, controls.poolSeed);
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
          look: isCustomDiceSet(diceSet) ? getCurrentLook(controls) : undefined,
          label: getPoolLabel(controls),
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
  const [measureRef, wide] = useWideTray();

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
      <GradientOverlay top height={wide ? 130 : 200} />
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
        <Stack direction="row" justifyContent="flex-end" width="100%">
          <Tooltip title="Очистить" disableInteractive>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                resetPool();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              sx={{ pointerEvents: "all", color: "white" }}
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <TrayHeader
        wide={wide}
        label={label}
        expanded={false}
        onExpand={() => {}}
      />
    </>
  );
}

/** While the dice roll: the difficulty can still be set, nothing else to do */
function RollingControls() {
  const roll = useDiceRollStore((state) => state.roll);
  const [measureRef, wide] = useWideTray();

  return (
    <>
      <GradientOverlay top height={wide ? 130 : 200} />
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
      />
      <TrayHeader
        wide={wide}
        label={roll?.label}
        expanded={false}
        onExpand={() => {}}
      />
    </>
  );
}

function FinishedRollControls() {
  const roll = useDiceRollStore((state) => state.roll);
  const clearRoll = useDiceRollStore((state) => state.clearRoll);
  const reroll = useDiceRollStore((state) => state.reroll);

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
  const [measureRef, wide] = useWideTray();

  return (
    <>
      <GradientOverlay
        top
        height={(wide ? 130 : 200) + (resultsExpanded ? 80 : 0)}
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
                // The tray and the dice may have been changed in the settings since the roll
                const mode = getTrayMode(useSettingsStore.getState().settings);
                const controls = useDiceControlsStore.getState();
                reroll(undefined, undefined, {
                  scale: mode.diceScale,
                  tray: getTrayModelWidth(mode.width),
                  style: controls.diceSet.dice[0].style,
                  look: isCustomDiceSet(controls.diceSet)
                    ? getCurrentLook(controls)
                    : undefined,
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
      {roll && (
        <TrayHeader
          wide={wide}
          values={values}
          label={roll.label}
          expanded={resultsExpanded}
          onExpand={setResultsExpanded}
        />
      )}
      {roll?.hidden && (
        <Box
          component="div"
          sx={{
            position: "absolute",
            top: wide ? 150 : 220,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {roll.gm ? (
            <Tooltip title="Этот бросок видит только мастер">
              <GmIcon htmlColor="white" sx={{ pointerEvents: "all" }} />
            </Tooltip>
          ) : (
            <Tooltip title="Этот бросок не видит никто">
              <HiddenIcon htmlColor="white" sx={{ pointerEvents: "all" }} />
            </Tooltip>
          )}
        </Box>
      )}
    </>
  );
}
