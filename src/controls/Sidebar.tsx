import SimpleBar from "simplebar-react";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";

import { CollapseButton } from "./CollapseButton";
import { PoolControls } from "./PoolControls";
import { DiceHidden } from "./DiceHidden";

import { PluginGate } from "../plugin/PluginGate";
import { DiceRollSync } from "../plugin/DiceRollSync";
import { PartyTrays } from "../plugin/PartyTrays";
import { TrayWindowSync } from "../plugin/TrayWindowSync";
import { RollHistorySync } from "../plugin/RollHistorySync";
import { WindowSizeButton } from "../plugin/WindowSizeButton";
import { SettingsButton } from "../settings/SettingsButton";
import { SheetButton } from "../sheet/SheetButton";

export function Sidebar() {
  return (
    <SimpleBar
      style={{
        maxHeight: "var(--tray-height, 100vh)",
        width: "60px",
        minWidth: "60px",
        overflowY: "auto",
      }}
    >
      <Stack p={1} gap={1} alignItems="center">
        {/* Packed tight to leave room for the players below without scrolling */}
        <Stack
          alignItems="center"
          sx={{ "& .MuiIconButton-sizeSmall": { p: "3px" } }}
        >
          <CollapseButton />
          <PoolControls />
          <DiceHidden />
        </Stack>
        <Divider flexItem sx={{ mx: 1 }} />
        <SheetButton />
        <SettingsButton />
        <PluginGate>
          <WindowSizeButton />
          <Divider flexItem sx={{ mx: 1 }} />
          <DiceRollSync />
          <RollHistorySync />
          <PartyTrays />
          <TrayWindowSync />
        </PluginGate>
      </Stack>
    </SimpleBar>
  );
}
