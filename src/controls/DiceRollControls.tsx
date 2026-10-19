import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

type Stage = "picked" | "rolling" | "finished";

/**
 * The controls over the tray. The difficulty and the speciality are shown
 * the same way through every stage: while the pool is picked, while the dice
 * roll and with the result. A check with a high difficulty can be set up
 * before anyone sees a result counted against the usual 6.
 *
 * The header and the measuring box live here, outside the stages, so that
 * a change of stage neither remounts them nor fades them in again.
 */
export function DiceRollControls() {
  const pool = useDiceControlsStore((state) => state.pool);
  const roll = useDiceRollStore((state) => state.roll);

  const rollValues = useDiceRollStore((state) => state.rollValues);
  const values = useMemo(() => {
    const values: number[] = [];
    for (const value of Object.values(rollValues)) {
      if (value === null) {
        return null;
      }
      values.push(faceToValue(value));
    }
    return values.length > 0 ? values : null;
  }, [rollValues]);

  const stage: Stage | null =
    pool > 0 ? "picked" : values ? "finished" : roll ? "rolling" : null;

  const [resultsExpanded, setResultsExpanded] = useState(false);
  useEffect(() => {
    if (stage !== "finished") {
      setResultsExpanded(false);
    }
  }, [stage]);

  const [measureRef, wide] = useWideTray();

  if (!stage) {
    return null;
  }

  const expanded = stage === "finished" && resultsExpanded;
  return (
    <>
      {stage === "picked" && (
        <Fade in>
          <span>
            <RollOverlay />
          </span>
        </Fade>
      )}
      <GradientOverlay top height={(wide ? 130 : 200) + (expanded ? 80 : 0)} />
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
        {stage === "picked" && (
          <Fade in>
            <div>
              <PickedButtons />
            </div>
          </Fade>
        )}
        {stage === "finished" && (
          <Fade in>
            <div>
              <FinishedButtons />
            </div>
          </Fade>
        )}
      </Box>
      <Fade in>
        <span>
          <TrayHeader
            wide={wide}
            values={stage === "finished" ? values ?? undefined : undefined}
            expanded={expanded}
            onExpand={setResultsExpanded}
          />
        </span>
      </Fade>
      {stage === "finished" && roll?.hidden && (
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

/**
 * Whether the tray is wide enough for the difficulty and the speciality at
 * the sides of the result. The measuring box comes and goes with the stages
 * of a roll while this hook lives on, so the observer is attached through a
 * callback ref, as soon as the box is there. React flushes the state set in
 * it before the paint, so the header never shows up in the wrong layout.
 */
function useWideTray() {
  const [wide, setWide] = useState(false);
  const observerRef = useRef<ResizeObserver>();
  const measureRef = useCallback((element: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = undefined;
    if (!element) {
      return;
    }
    const measure = () => setWide(element.clientWidth >= WIDE_RESULT_WIDTH);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observerRef.current = observer;
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
  expanded,
  onExpand,
}: {
  wide: boolean;
  /** The values of the dice once they have landed */
  values?: number[];
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
        expanded={expanded}
        onExpand={onExpand}
      />
    </Stack>
  );
}

/**
 * The whole tray is the roll button while the pool is picked. The pill in
 * the middle says what is being rolled, "БРОСОК: Сила + Атлетика + 2d10",
 * and grows or shrinks with the pool.
 */
function RollOverlay() {
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

  // The text of the pill is given its width explicitly so that it can
  // animate: a width of "auto" doesn't. The width comes from a hidden copy
  // of the text, the visible one is already held at the width of the pill.
  const measureRef = useRef<HTMLSpanElement>(null);
  const [textWidth, setTextWidth] = useState<number>();
  useLayoutEffect(() => {
    if (measureRef.current) {
      setTextWidth(measureRef.current.offsetWidth);
    }
  }, [label]);

  const theme = useTheme();

  return (
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
          backgroundColor: theme.palette.primary.dark,
        },
        ":active #dice-roll-button": {
          backgroundColor: theme.palette.primary.dark,
        },
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handleRoll}
      aria-label={`бросок: ${label}`}
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
            maxWidth: "calc(100% - 48px)",
            minWidth: 0,
            borderRadius: "20px",
            textTransform: "none",
            whiteSpace: "nowrap",
            transition: theme.transitions.create("background-color"),
          }}
          endIcon={<RollIcon />}
          variant="contained"
          id="dice-roll-button"
          // @ts-ignore
          component="div"
        >
          <Box
            component="span"
            sx={{
              display: "block",
              width: textWidth,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              transition: theme.transitions.create("width"),
            }}
          >
            БРОСОК: {label}
          </Box>
          <Box
            component="span"
            ref={measureRef}
            aria-hidden
            sx={{
              position: "absolute",
              visibility: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            БРОСОК: {label}
          </Box>
        </Button>
      </Box>
    </ButtonBase>
  );
}

/** Over the pool: clear it */
function PickedButtons() {
  const resetPool = useDiceControlsStore((state) => state.resetPool);
  return (
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
  );
}

/** Over a finished roll: reroll everything or clear the tray */
function FinishedButtons() {
  const clearRoll = useDiceRollStore((state) => state.clearRoll);
  const reroll = useDiceRollStore((state) => state.reroll);

  return (
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
  );
}
