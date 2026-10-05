import { useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";

import mask from "../glass/mask.png";
import { useDiceLook } from "../../dice/lookContext";
import { getIconUrl } from "./icons";
import { getLookTextures } from "./textures";

/**
 * The material of custom dice: painted from the look the player put together
 * in the settings instead of coming from image files.
 */
export function CustomMaterial(
  props: JSX.IntrinsicElements["meshPhysicalMaterial"]
) {
  const look = useDiceLook();

  const tenIconUrl = getIconUrl(look.tenIcon);
  const oneIconUrl = getIconUrl(look.oneIcon);
  // Always three images to keep the hook the same, the mask stands in for an icon that isn't there
  const [maskImage, tenIcon, oneIcon] = useLoader(THREE.ImageLoader, [
    mask,
    tenIconUrl || mask,
    oneIconUrl || mask,
  ]);

  const textures = useMemo(
    () =>
      getLookTextures(
        look,
        maskImage,
        tenIconUrl ? tenIcon : undefined,
        oneIconUrl ? oneIcon : undefined
      ),
    [look, maskImage, tenIcon, oneIcon, tenIconUrl, oneIconUrl]
  );

  const bodyColor = useMemo(() => new THREE.Color(look.body), [look.body]);

  const glass = look.finish === "glass";

  return (
    <meshPhysicalMaterial
      // A finish turns features of the shader on and off: start a new material for it
      key={`${look.finish}-${look.glow > 0}`}
      map={textures.map}
      normalMap={textures.normalMap}
      // The roughness and the metalness are painted into the texture
      roughnessMap={textures.surfaceMap}
      metalnessMap={textures.surfaceMap}
      roughness={1}
      metalness={1}
      emissiveMap={look.glow > 0 ? textures.emissiveMap : null}
      emissive={look.glow > 0 ? "#ffffff" : "#000000"}
      emissiveIntensity={look.glow * 2}
      // The light of the tray comes from above, right where the camera is: at full
      // strength its reflection washes out the top faces of dark dice
      specularIntensity={0.4}
      clearcoat={look.finish === "gloss" ? 0.6 : 0}
      clearcoatRoughness={0.3}
      iridescence={look.finish === "pearl" ? 1 : 0}
      iridescenceIOR={1.8}
      sheen={look.finish === "pearl" ? 0.5 : 0}
      transmission={glass ? 1 : 0}
      transmissionMap={glass ? textures.surfaceMap : null}
      thickness={glass ? 2 : 0}
      attenuationColor={bodyColor}
      attenuationDistance={glass ? 0.3 : Infinity}
      {...props}
    />
  );
}
