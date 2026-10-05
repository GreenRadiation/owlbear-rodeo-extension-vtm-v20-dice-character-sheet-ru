import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";

import Box from "@mui/material/Box";

import environment from "../environment.hdr";
import { Dice } from "../dice/Dice";
import { DiceLook } from "../dice/look";
import { DiceLookContext } from "../dice/lookContext";
import { Die } from "../types/Die";
import { CustomDicePreview } from "./CustomDicePreview";

/** Where the "0" is on the mesh of a D10 and the turn that puts it upright, see meshes/rounded/D10.tsx */
const TEN_FACE = new THREE.Vector3(0.4, 0.42, -0.56).normalize();
const TEN_TWIST = -Math.PI / 2;
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
  const facing = useMemo(() => {
    const toCamera = new THREE.Quaternion().setFromUnitVectors(
      TEN_FACE,
      TOWARDS_CAMERA
    );
    return new THREE.Quaternion()
      .setFromAxisAngle(TOWARDS_CAMERA, TEN_TWIST)
      .multiply(toCamera);
  }, []);

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
            <Environment files={environment} />
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
