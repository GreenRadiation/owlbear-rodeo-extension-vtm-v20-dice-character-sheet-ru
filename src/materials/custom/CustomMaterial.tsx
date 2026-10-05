import { useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";

import mask from "../glass/mask.png";
import galaxy from "../galaxy/albedo.jpg";
import gemstone from "../gemstone/albedo.jpg";
import nebula from "../nebula/albedo.jpg";
import sunrise from "../sunrise/albedo.jpg";
import sunset from "../sunset/albedo.jpg";
import walnut from "../walnut/albedo.jpg";
import { TexturePattern, isTexturePattern } from "../../dice/look";
import { useDiceLook } from "../../dice/lookContext";
import { getIconUrl } from "./icons";
import { getLookTextures } from "./textures";

/** The textures of the original dice a look can take its pattern from, only loaded when one is used */
const PATTERN_URLS: Record<TexturePattern, string> = {
  galaxy,
  gemstone,
  nebula,
  sunrise,
  sunset,
  walnut,
};

/** Thickness in nanometers of the film that makes the shimmer, picks the colors it goes through */
const MIN_FILM_THICKNESS = 150;
const MAX_FILM_THICKNESS = 850;

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
  const patternUrl = isTexturePattern(look.pattern)
    ? PATTERN_URLS[look.pattern]
    : undefined;
  // Always four images to keep the hook the same, the mask stands in for what isn't there
  const [maskImage, tenIcon, oneIcon, pattern] = useLoader(THREE.ImageLoader, [
    mask,
    tenIconUrl || mask,
    oneIconUrl || mask,
    patternUrl || mask,
  ]);

  const textures = useMemo(
    () =>
      getLookTextures(
        look,
        maskImage,
        tenIconUrl ? tenIcon : undefined,
        oneIconUrl ? oneIcon : undefined,
        patternUrl ? pattern : undefined
      ),
    [
      look,
      maskImage,
      tenIcon,
      oneIcon,
      pattern,
      tenIconUrl,
      oneIconUrl,
      patternUrl,
    ]
  );

  const bodyColor = useMemo(() => new THREE.Color(look.body), [look.body]);
  const normalScale = useMemo(
    () => new THREE.Vector2(look.engraving * 2, look.engraving * 2),
    [look.engraving]
  );
  const filmThickness = useMemo<[number, number]>(
    () => [
      MIN_FILM_THICKNESS,
      MIN_FILM_THICKNESS +
        look.iridescenceHue * (MAX_FILM_THICKNESS - MIN_FILM_THICKNESS),
    ],
    [look.iridescenceHue]
  );

  const glows = look.glow > 0;
  const lacquered = look.clearcoat > 0;
  const shimmers = look.iridescence > 0;
  const velvety = look.sheen > 0;
  const clear = look.transmission > 0;
  // Keeps the lacquer and the shimmer off the digits
  const bodyOnly = look.digitsCoated ? null : textures.surfaceMap;

  return (
    <meshPhysicalMaterial
      // These turn features of the shader on and off: start a new material when they change
      key={[
        glows,
        lacquered,
        shimmers,
        velvety,
        clear,
        look.digitsCoated,
      ].join()}
      map={textures.map}
      normalMap={textures.normalMap}
      normalScale={normalScale}
      // The roughness and the metalness are painted into the texture
      roughnessMap={textures.surfaceMap}
      metalnessMap={textures.surfaceMap}
      roughness={1}
      metalness={1}
      emissiveMap={glows ? textures.emissiveMap : null}
      emissive={glows ? "#ffffff" : "#000000"}
      emissiveIntensity={look.glow * 2}
      specularIntensity={look.specular}
      specularColor={look.specularColor}
      envMapIntensity={look.reflections * 2}
      clearcoat={look.clearcoat}
      clearcoatRoughness={look.clearcoatRoughness}
      clearcoatMap={lacquered ? bodyOnly : null}
      iridescence={look.iridescence}
      iridescenceIOR={1.8}
      iridescenceThicknessRange={filmThickness}
      iridescenceMap={shimmers ? bodyOnly : null}
      sheen={look.sheen}
      sheenColor={look.sheenColor}
      sheenRoughness={0.5}
      transmission={look.transmission}
      // The digits of a die of glass stay solid
      transmissionMap={clear ? textures.surfaceMap : null}
      thickness={clear ? 2 : 0}
      attenuationColor={bodyColor}
      attenuationDistance={clear ? 0.3 : Infinity}
      {...props}
    />
  );
}
