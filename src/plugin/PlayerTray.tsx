import { useState } from "react";
import {
  ContactShadows,
  Environment,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Player } from "@owlbear-rodeo/sdk";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Fade from "@mui/material/Fade";
import Backdrop from "@mui/material/Backdrop";
import Tooltip from "@mui/material/Tooltip";

import HiddenIcon from "@mui/icons-material/VisibilityOffRounded";

import environment from "../environment.hdr";
import { GradientOverlay } from "../controls/GradientOverlay";
import { RollResult } from "../controls/RollResult";
import { usePlayerDice } from "./usePlayerDice";
import { PlayerDiceRoll } from "./PlayerDiceRoll";
import { AudioListenerProvider } from "../audio/AudioListenerProvider";
import { Tray } from "../tray/Tray";
import { useDebugStore } from "../debug/store";
import { TraySuspense } from "../tray/TraySuspense";
import { RollHistoryButton } from "./RollHistoryButton";

export function PlayerTray({
  player,
}: {
  player?: Player; // Make player optional to allow for preloading of the tray
}) {
  const allowOrbit = useDebugStore((state) => state.allowOrbit);

  return (
    <Box component="div" position="relative" display="flex">
      <Box
        component="div"
        borderRadius={0.5}
        height="100vh"
        width="calc(100vh / 2)"
        overflow="hidden"
        position="relative"
      >
        <TraySuspense>
          <Canvas frameloop="demand">
            <AudioListenerProvider>
              <Environment files={environment} />
              <ContactShadows
                resolution={256}
                scale={[1, 2]}
                position={[0, 0, 0]}
                blur={0.5}
                opacity={0.5}
                far={1}
                color="#222222"
              />
              <Tray />
              <PlayerDiceRoll player={player} />
              <PerspectiveCamera
                makeDefault
                fov={28}
                position={[0, 4.3, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
              />
              {allowOrbit && <OrbitControls />}
            </AudioListenerProvider>
          </Canvas>
        </TraySuspense>
      </Box>
      <PlayerTrayResults player={player} />
      {player && (
        <Box
          component="div"
          sx={{ position: "absolute", bottom: 12, left: 12, zIndex: 1 }}
        >
          <RollHistoryButton playerId={player.id} color="white" />
        </Box>
      )}
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          pointerEvents: "none",
          padding: 3,
        }}
        component="div"
      >
        <Typography
          variant="h6"
          color="rgba(255, 255, 255, 0.7)"
          textAlign="center"
        >
          {player?.name}
        </Typography>
      </Box>
    </Box>
  );
}

function PlayerTrayResults({ player }: { player?: Player }) {
  const { diceRoll, outcome, values, difficulty } = usePlayerDice(player);

  const [resultsExpanded, setResultsExpanded] = useState(false);
  return (
    <>
      {diceRoll?.hidden && (
        <Backdrop open sx={{ position: "absolute" }}>
          <Tooltip title="Скрытый бросок">
            <HiddenIcon htmlColor="white" />
          </Tooltip>
        </Backdrop>
      )}
      {outcome !== null && (
        <>
          <Fade in>
            <GradientOverlay top height={resultsExpanded ? 220 : 140} />
          </Fade>
          <GradientOverlay />
          <Fade in>
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
            >
              <Stack
                direction="row"
                justifyContent="center"
                width="100%"
                alignItems="start"
              >
                <RollResult
                  values={values}
                  difficulty={difficulty}
                  expanded={resultsExpanded}
                  onExpand={setResultsExpanded}
                />
              </Stack>
            </Box>
          </Fade>
        </>
      )}
    </>
  );
}
