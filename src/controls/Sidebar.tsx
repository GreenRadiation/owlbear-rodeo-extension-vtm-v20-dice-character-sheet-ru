import SimpleBar from "simplebar-react";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";

import { DiceSetPicker } from "./DiceSetPicker";
import { PoolControls } from "./PoolControls";
import { DiceHidden } from "./DiceHidden";

import { PluginGate } from "../plugin/PluginGate";
import { DiceRollSync } from "../plugin/DiceRollSync";
import { PartyTrays } from "../plugin/PartyTrays";
import { TrayWindowSync } from "../plugin/TrayWindowSync";
import { RollHistorySync } from "../plugin/RollHistorySync";
import { OwnRollHistoryButton } from "../plugin/RollHistoryButton";
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
        <DiceSetPicker />
        <Divider flexItem sx={{ mx: 1 }} />
        <PoolControls />
        <Divider flexItem sx={{ mx: 1 }} />
        <DiceHidden />
        <SheetButton />
        <SettingsButton />
        <PluginGate>
          <OwnRollHistoryButton />
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
