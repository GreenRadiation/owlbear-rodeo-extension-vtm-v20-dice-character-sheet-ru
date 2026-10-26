import { useEffect, useRef } from "react";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import AllIcon from "@mui/icons-material/VisibilityRounded";
import GmIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import NoneIcon from "@mui/icons-material/VisibilityOffRounded";

import { Visibility, useDiceControlsStore } from "./store";
import { useDiceRollStore } from "../dice/store";
import { useRole } from "../plugin/useRole";

const TITLES: Record<Visibility, string> = {
  ALL: "Бросок видят все",
  GM: "Бросок видит только мастер",
  NONE: "Бросок не видит никто",
};

/** How long the button is held to show a hidden roll to everyone */
const HOLD_MS = 1000;

/**
 * Button that picks who sees the next roll: everyone, only the GM or no one.
 * Held down over a finished hidden roll, it shows that roll to everyone:
 * the same dice are thrown the same way again, now in the open. No hint
 * and no progress ring on purpose: the author found them in the way for
 * so rare a case.
 */
export function DiceHidden() {
  const visibility = useDiceControlsStore((state) => state.visibility);
  const cycleVisibility = useDiceControlsStore(
    (state) => state.cycleVisibility
  );
  const setVisibility = useDiceControlsStore((state) => state.setVisibility);

  const gm = useRole() === "GM";

  const clearRoll = useDiceRollStore((state) => state.clearRoll);
  const revealRoll = useDiceRollStore((state) => state.revealRoll);
  const roll = useDiceRollStore((state) => state.roll);
  const canReveal = useDiceRollStore((state) => {
    if (!state.roll?.hidden) {
      return false;
    }
    const values = Object.values(state.rollValues);
    return values.length > 0 && values.every((value) => value !== null);
  });

  // The hold: a timer and a flag that swallows the click the release of a
  // finished hold still fires
  const timer = useRef<number>();
  const held = useRef(false);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function startHold() {
    if (!canReveal) {
      return;
    }
    held.current = false;
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      held.current = true;
      revealRoll();
      setVisibility("ALL");
    }, HOLD_MS);
  }

  function cancelHold() {
    if (timer.current !== undefined) {
      window.clearTimeout(timer.current);
      timer.current = undefined;
    }
  }

  function handleClick() {
    if (held.current) {
      held.current = false;
      return;
    }
    cycleVisibility(gm);
    if (roll) {
      clearRoll();
    }
  }

  return (
    <Tooltip title={TITLES[visibility]} placement="right" disableInteractive>
      <IconButton
        size="small"
        aria-label={TITLES[visibility]}
        onClick={handleClick}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
        sx={{ touchAction: "none" }}
      >
        {visibility === "ALL" && <AllIcon />}
        {visibility === "GM" && <GmIcon />}
        {visibility === "NONE" && <NoneIcon />}
      </IconButton>
    </Tooltip>
  );
}
