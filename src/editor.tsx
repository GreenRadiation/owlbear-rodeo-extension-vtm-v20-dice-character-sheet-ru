import OBR from "@owlbear-rodeo/sdk";
import React, { useRef } from "react";
import ReactDOM from "react-dom/client";

import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import CloseIcon from "@mui/icons-material/CloseRounded";
import ResizeIcon from "@mui/icons-material/OpenInFullRounded";

import "./fonts/fonts.css";
import { GlobalStyles } from "./GlobalStyles";
import { PluginGate } from "./plugin/PluginGate";
import { PluginThemeProvider } from "./plugin/PluginThemeProvider";
import { DiceLookSettings } from "./settings/DiceLookSettings";
import { LightSettings } from "./settings/LightSettings";
import { closeLookEditor, resizeLookEditor } from "./settings/lookEditor";
import {
  MAX_EDITOR_HEIGHT,
  MAX_EDITOR_WIDTH,
  MIN_EDITOR_HEIGHT,
  MIN_EDITOR_WIDTH,
  useSettingsStore,
} from "./settings/store";

/**
 * A corner to drag to change the size of the window.
 * The window grows to the left: it sits at the right edge of the screen.
 * The size is remembered for the next time.
 */
function ResizeGrip() {
  const changeSettings = useSettingsStore((state) => state.changeSettings);
  const frame = useRef(0);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const start = { x: event.clientX, y: event.clientY };
    const size = { width: window.innerWidth, height: window.innerHeight };
    let latest = size;
    const clampSize = (width: number, height: number) => ({
      width: Math.round(
        Math.min(MAX_EDITOR_WIDTH, Math.max(MIN_EDITOR_WIDTH, width))
      ),
      height: Math.round(
        Math.min(MAX_EDITOR_HEIGHT, Math.max(MIN_EDITOR_HEIGHT, height))
      ),
    });
    const handleMove = (move: PointerEvent) => {
      // Dragging to the left widens the window, down makes it taller
      latest = clampSize(
        size.width - (move.clientX - start.x),
        size.height + (move.clientY - start.y)
      );
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        resizeLookEditor(latest.width, latest.height);
      });
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      changeSettings({
        editorWidth: latest.width,
        editorHeight: latest.height,
      });
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  return (
    <Stack
      component="div"
      onPointerDown={handlePointerDown}
      title="Потяни, чтобы изменить размер окна"
      alignItems="center"
      justifyContent="center"
      sx={{
        position: "fixed",
        left: 0,
        bottom: 0,
        width: 28,
        height: 28,
        cursor: "nesw-resize",
        color: "text.secondary",
        bgcolor: "background.paper",
        borderTopRightRadius: 8,
        zIndex: 3,
        touchAction: "none",
      }}
    >
      <ResizeIcon sx={{ fontSize: 16, transform: "scaleX(-1)" }} />
    </Stack>
  );
}

/**
 * The window of the editor of custom dice, opened from the settings of the
 * tray (see settings/lookEditor.ts). Lives next to the tray so that the dice
 * can be rolled while they are being changed. What is changed here reaches
 * the tray through localStorage, like the other settings.
 */
function EditorWindow() {
  const slot = Number(new URLSearchParams(location.search).get("slot")) || 0;

  return (
    // The body of the page doesn't scroll, this does
    <Stack
      p={2}
      gap={2}
      height="100vh"
      boxSizing="border-box"
      sx={{ overflowX: "hidden", overflowY: "auto" }}
    >
      {OBR.isAvailable && <ResizeGrip />}
      <Stack direction="row" alignItems="center" gap={1}>
        <Typography variant="h6" flex={1}>
          Свои кубы
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Кубы в лотке меняются сразу, можно бросать и смотреть
        </Typography>
        {OBR.isAvailable && (
          <IconButton aria-label="закрыть" onClick={() => closeLookEditor()}>
            <CloseIcon />
          </IconButton>
        )}
      </Stack>
      <DiceLookSettings slot={slot} />
      <Divider />
      <LightSettings />
    </Stack>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PluginThemeProvider>
      <CssBaseline />
      <GlobalStyles />
      {OBR.isAvailable ? (
        <PluginGate>
          <EditorWindow />
        </PluginGate>
      ) : (
        <EditorWindow />
      )}
    </PluginThemeProvider>
  </React.StrictMode>
);
