import { useEffect, useRef, useState } from "react";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Player } from "@owlbear-rodeo/sdk";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Fade from "@mui/material/Fade";
import Backdrop from "@mui/material/Backdrop";
import Tooltip from "@mui/material/Tooltip";

import HiddenIcon from "@mui/icons-material/VisibilityOffRounded";
import GmIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import PreviewOnIcon from "@mui/icons-material/PictureInPictureAltRounded";
import PreviewOffIcon from "@mui/icons-material/CancelPresentationRounded";

import environment from "../environment.hdr";
import { GradientOverlay } from "../controls/GradientOverlay";
import { RollResult, WIDE_RESULT_WIDTH } from "../controls/RollResult";
import { usePlayerDice } from "./usePlayerDice";
import { PlayerDiceRoll } from "./PlayerDiceRoll";
import { AudioListenerProvider } from "../audio/AudioListenerProvider";
import { Tray } from "../tray/Tray";
import { TrayCamera } from "../tray/TrayCamera";
import { useDebugStore } from "../debug/store";
import { TraySuspense } from "../tray/TraySuspense";
import { RollHistoryButton } from "./RollHistoryButton";
import {
  DEFAULT_TRAY_MODEL_WIDTH,
  getTrayMode,
  isTrayLandscape,
  useSettingsStore,
} from "../settings/store";

/** The tray of another player opened over the tray of this player */
export function PlayerTray({
  player,
}: {
  player?: Player; // Make player optional to allow for preloading of the tray
}) {
  const allowOrbit = useDebugStore((state) => state.allowOrbit);
  // The tray of the player is as wide as it was for their roll
  const { diceRoll } = usePlayerDice(player);
  const trayWidth = diceRoll?.tray || DEFAULT_TRAY_MODEL_WIDTH;
  // The room for it has the shape of the tray of this player: when that one
  // lies on its side this one is turned too to be as large as it can
  const landscape = useSettingsStore((state) =>
    isTrayLandscape(getTrayMode(state.settings).width)
  );

  // Measure the tray to lay out the result of the roll
  const trayRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const element = trayRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(() =>
      setWide(element.clientWidth >= WIDE_RESULT_WIDTH)
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      component="div"
      display="flex"
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
    >
      {/* The tray keeps its shape and gets smaller if it doesn't fit in this window */}
      <Box
        ref={trayRef}
        component="div"
        borderRadius={0.5}
        width={
          landscape
            ? `min(100%, calc(var(--tray-height, 100vh) * 2 / ${trayWidth}))`
            : `min(100%, calc(var(--tray-height, 100vh) / 2 * ${trayWidth}))`
        }
        sx={{
          aspectRatio: landscape ? `2 / ${trayWidth}` : `${trayWidth} / 2`,
        }}
        overflow="hidden"
        position="relative"
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
              <PlayerDiceRoll player={player} />
              <TrayCamera trayWidth={trayWidth} landscape={landscape} />
              {allowOrbit && <OrbitControls />}
            </AudioListenerProvider>
          </Canvas>
        </TraySuspense>
        <PlayerTrayResults player={player} wide={wide} />
        {player && (
          <Stack
            direction="row"
            sx={{ position: "absolute", bottom: 12, left: 12, zIndex: 1 }}
          >
            <RollHistoryButton playerId={player.id} color="white" />
            <PreviewButton playerId={player.id} />
          </Stack>
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
    </Box>
  );
}

/** Button that keeps the rolls of a player out of the previews in the corner of the screen */
function PreviewButton({ playerId }: { playerId: string }) {
  const hidden = useSettingsStore((state) =>
    state.settings.hiddenPreviews.includes(playerId)
  );
  const changeSettings = useSettingsStore((state) => state.changeSettings);

  function handleClick() {
    const ids = useSettingsStore.getState().settings.hiddenPreviews;
    changeSettings({
      hiddenPreviews: hidden
        ? ids.filter((id) => id !== playerId)
        : [...ids, playerId],
    });
  }

  const title = hidden
    ? "Броски этого игрока не показываются в углу экрана. Нажми, чтобы показывать"
    : "Броски этого игрока показываются в углу экрана. Нажми, чтобы не показывать";

  return (
    <Tooltip title={title} placement="top" disableInteractive>
      <IconButton
        aria-label={title}
        aria-pressed={hidden}
        onClick={handleClick}
        sx={{ color: "white", pointerEvents: "all" }}
      >
        {hidden ? <PreviewOffIcon /> : <PreviewOnIcon />}
      </IconButton>
    </Tooltip>
  );
}

function PlayerTrayResults({
  player,
  wide,
}: {
  player?: Player;
  wide: boolean;
}) {
  const { diceRoll, gmOnly, outcome, values, difficulty, specialty } =
    usePlayerDice(player);

  const [resultsExpanded, setResultsExpanded] = useState(false);
  const overlayHeight = (wide ? 110 : 170) + (resultsExpanded ? 80 : 0);
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
            <GradientOverlay top height={overlayHeight} />
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
              <Stack width="100%" alignItems="center">
                <RollResult
                  values={values}
                  difficulty={difficulty}
                  specialty={specialty}
                  expanded={resultsExpanded}
                  onExpand={setResultsExpanded}
                  wide={wide}
                />
                {gmOnly && (
                  <Tooltip title="Этот бросок видит только мастер">
                    <GmIcon htmlColor="white" sx={{ pointerEvents: "all" }} />
                  </Tooltip>
                )}
              </Stack>
            </Box>
          </Fade>
        </>
      )}
    </>
  );
}
