import OBR from "@owlbear-rodeo/sdk";
import React from "react";
import ReactDOM from "react-dom/client";

import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import CloseIcon from "@mui/icons-material/CloseRounded";

import "./fonts/fonts.css";
import { GlobalStyles } from "./GlobalStyles";
import { PluginGate } from "./plugin/PluginGate";
import { PluginThemeProvider } from "./plugin/PluginThemeProvider";
import { DiceLookSettings } from "./settings/DiceLookSettings";
import { LightSettings } from "./settings/LightSettings";
import { closeLookEditor } from "./settings/lookEditor";

/**
 * The window of the editor of custom dice, opened from the settings of the
 * tray (see settings/lookEditor.ts). Lives next to the tray so that the dice
 * can be rolled while they are being changed. What is changed here reaches
 * the tray through localStorage, like the other settings.
 */
function EditorWindow() {
  const slot = Number(new URLSearchParams(location.search).get("slot")) || 0;

  return (
    <Stack p={2} gap={2} sx={{ overflowX: "hidden", overflowY: "auto" }}>
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
