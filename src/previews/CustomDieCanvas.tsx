import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { TrayEnvironment } from "../tray/TrayEnvironment";

import Box from "@mui/material/Box";

import { Dice } from "../dice/Dice";
import { DiceLook } from "../dice/look";
import { DiceLookContext } from "../dice/lookContext";
import { Die } from "../types/Die";
import { CustomDicePreview } from "./CustomDicePreview";

import { TEN_FACE, TEN_UP, getFacingQuaternion } from "./facing";

/** A little from above, as the tray is seen */
const TOWARDS_CAMERA = new THREE.Vector3(0, 0.45, 1).normalize();

const PREVIEW_DIE: Die = { id: "preview-button", style: "CUSTOM", type: "D10" };

/**
 * A small live picture of custom dice for buttons: a die with its ten towards
 * the viewer, drawn with the real material so the pattern and the surface show.
 * Only drawn again when the look changes. A flat picture stands in until the
 * die is ready.
 */
export function CustomDieCanvas({
  look,
  size,
}: {
  look: DiceLook;
  /** Width and height in pixels */
  size: number;
}) {
  const facing = useMemo(
    () => getFacingQuaternion(TEN_FACE, TOWARDS_CAMERA, TEN_UP),
    []
  );

  return (
    <Box
      component="div"
      position="relative"
      width={size}
      height={size}
      sx={{ pointerEvents: "none" }}
    >
      <Box component="div" position="absolute" top={0} left={0}>
        <CustomDicePreview look={look} size={size} />
      </Box>
      <Box
        component="div"
        position="absolute"
        top={0}
        left={0}
        width={size}
        height={size}
      >
        <Canvas
          frameloop="demand"
          camera={{ position: [0, 0.2, 0.44], fov: 26 }}
          gl={{ alpha: true }}
          style={{ background: "transparent" }}
        >
          <Suspense fallback={null}>
            <TrayEnvironment />
            <DiceLookContext.Provider value={look}>
              <group quaternion={facing}>
                <Dice die={PREVIEW_DIE} />
              </group>
            </DiceLookContext.Provider>
          </Suspense>
        </Canvas>
      </Box>
    </Box>
  );
}
