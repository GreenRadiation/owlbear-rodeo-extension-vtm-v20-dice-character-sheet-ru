import OBR from "@owlbear-rodeo/sdk";
import { useEffect, useState } from "react";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import SizeIcon from "@mui/icons-material/AspectRatioRounded";

import { getPluginId } from "./getPluginId";

/**
 * Heights of the window of the tray, the width follows the height (see ResizeObserver).
 * The middle one is the size of the original Owlbear Rodeo dice roller.
 */
const HEIGHTS = [560, 700, 880];
const DEFAULT_HEIGHT = 700;
const STORAGE_KEY = getPluginId("window-height");

function loadHeight(): number {
  try {
    const height = Number(localStorage.getItem(STORAGE_KEY));
    return HEIGHTS.includes(height) ? height : DEFAULT_HEIGHT;
  } catch {
    return DEFAULT_HEIGHT;
  }
}

/** Button that cycles the size of the window of the tray, the choice is remembered */
export function WindowSizeButton() {
  const [height, setHeight] = useState(loadHeight);

  useEffect(() => {
    OBR.action.setHeight(height);
    try {
      localStorage.setItem(STORAGE_KEY, `${height}`);
    } catch {
      // Storage can be unavailable, the choice just won't be remembered
    }
  }, [height]);

  function handleClick() {
    setHeight(HEIGHTS[(HEIGHTS.indexOf(height) + 1) % HEIGHTS.length]);
  }

  return (
    <Tooltip title="Размер окна" placement="top" disableInteractive>
      <IconButton aria-label="размер окна" onClick={handleClick}>
        <SizeIcon />
      </IconButton>
    </Tooltip>
  );
}
