import { useLayoutEffect } from "react";

import Stack from "@mui/material/Stack";

import { CollapseButton } from "./controls/CollapseButton";
import { COLLAPSED_HEIGHT, SIDEBAR_WIDTH } from "./plugin/TrayWindowSync";

import { InteractiveTray } from "./tray/InteractiveTray";
import { Sidebar } from "./controls/Sidebar";
import { SheetPanel } from "./sheet/SheetPanel";
import { getTrayMode, useSettingsStore } from "./settings/store";

/**
 * The window of the extension: the sidebar and the tray, and the character
 * sheet below or to the right of them when it is open.
 * The size of the window itself is kept by TrayWindowSync.
 * When everything is collapsed the window is a single button. The rest stays
 * mounted but isn't displayed: a roll that is in the tray goes on.
 */
export function App() {
  const mode = useSettingsStore((state) => getTrayMode(state.settings));
  const sheetOpen = useSettingsStore((state) => state.settings.sheetOpen);
  const collapsed = useSettingsStore((state) => state.settings.collapsed);
  const below = mode.sheetPlacement === "below";

  // The tray is as high as the settings say unless the window is smaller than that.
  // Set on the root element so that dialogs, which render outside of the app, see it too
  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      "--tray-height",
      `min(${mode.height}px, 100vh)`
    );
  }, [mode.height]);

  return (
    <>
      {collapsed && (
        <Stack
          width={SIDEBAR_WIDTH}
          height={COLLAPSED_HEIGHT}
          alignItems="center"
          justifyContent="center"
        >
          <CollapseButton />
        </Stack>
      )}
      <Stack
        direction={below ? "column" : "row"}
        height="100vh"
        display={collapsed ? "none" : "flex"}
      >
        <Stack
          direction="row"
          flexShrink={0}
          justifyContent="center"
          position="relative"
          id="tray-area"
        >
          <Sidebar />
          <InteractiveTray />
        </Stack>
        {sheetOpen && (
          <SheetPanel
            columns={mode.sheetColumns}
            style={
              below
                ? { flex: 1, minHeight: 0 }
                : { flex: 1, minWidth: 0, height: "var(--tray-height)" }
            }
          />
        )}
      </Stack>
    </>
  );
}
