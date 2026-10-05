import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";

import Box from "@mui/material/Box";

import { InteractiveDiceRoll } from "../dice/InteractiveDiceRoll";
import { DiceRollControls } from "../controls/DiceRollControls";
import environment from "../environment.hdr";
import { AudioListenerProvider } from "../audio/AudioListenerProvider";
import { Tray } from "./Tray";
import { useDebugStore } from "../debug/store";
import { TraySuspense } from "./TraySuspense";
import { PreviewDiceRoll } from "../dice/PreviewDiceRoll";
import { useDiceRollStore } from "../dice/store";
import {
  getTrayModelWidth,
  getTrayMode,
  isTrayLandscape,
  useSettingsStore,
} from "../settings/store";
import { TrayCamera } from "./TrayCamera";
import { PluginGate } from "../plugin/PluginGate";
import { OwnRollHistoryButton } from "../plugin/RollHistoryButton";

/** Dice tray that controls the dice roll store */
export function InteractiveTray() {
  const allowOrbit = useDebugStore((state) => state.allowOrbit);

  // The window follows the settings, the tray itself stays as wide as it was
  // for the roll that is in it
  const settingsWidth = useSettingsStore(
    (state) => getTrayMode(state.settings).width
  );
  const rollWidth = useDiceRollStore((state) => state.roll?.tray);
  const trayWidth = rollWidth || getTrayModelWidth(settingsWidth);

  return (
    <Box
      component="div"
      borderRadius={1}
      height="var(--tray-height, 100vh)"
      width={`calc(var(--tray-height, 100vh) * ${settingsWidth})`}
      flexShrink={0}
      overflow="hidden"
      position="relative"
      id="interactive-tray"
      sx={{
        "& canvas": {
          touchAction: "manipulation",
          userSelect: "none",
        },
      }}
    >
      <TraySuspense>
        <Canvas frameloop="demand">
          <AudioListenerProvider>
            <Environment files={environment} />
            <ContactShadows
              resolution={256}
              scale={[trayWidth, 2]}
              position={[0, 0, 0]}
              blur={0.5}
              opacity={0.5}
              far={1}
              color="#222222"
            />
            <Tray widthScale={trayWidth} />
            <PreviewDiceRoll />
            <InteractiveDiceRoll />
            <TrayCamera
              trayWidth={trayWidth}
              landscape={isTrayLandscape(settingsWidth)}
            />
            {allowOrbit && <OrbitControls />}
          </AudioListenerProvider>
        </Canvas>
      </TraySuspense>
      <DiceRollControls />
      {/* After the controls of the roll to stay clickable over them */}
      <PluginGate>
        <Box
          component="div"
          sx={{ position: "absolute", bottom: 12, left: 12, zIndex: 1 }}
        >
          <OwnRollHistoryButton />
        </Box>
      </PluginGate>
    </Box>
  );
}
