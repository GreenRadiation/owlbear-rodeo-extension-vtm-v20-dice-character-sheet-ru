import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useLoader, useThree } from "@react-three/fiber";

import mask from "../glass/mask.png";
import galaxy from "../galaxy/albedo.jpg";
import gemstone from "../gemstone/albedo.jpg";
import nebula from "../nebula/albedo.jpg";
import sunrise from "../sunrise/albedo.jpg";
import sunset from "../sunset/albedo.jpg";
import walnut from "../walnut/albedo.jpg";
import { DiceLook, TexturePattern, isTexturePattern } from "../../dice/look";
import { useDiceLook } from "../../dice/lookContext";
import { getIconUrl } from "./icons";
import { DiceFontLoader } from "./fonts";
import { LookTextures, getLookTextures, getPatternMap } from "./textures";
import {
  PatternUniforms,
  applyPatternUniforms,
  createPatternUniforms,
  getPatternSeed,
  installPatternShader,
} from "./shader";

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
 * Set up a material for a look.
 * Done by hand and not with props: react-three-fiber marks every texture it
 * is given as a prop as sRGB, which is wrong for normals and roughness.
 */
function applyLook(
  material: THREE.MeshPhysicalMaterial,
  look: DiceLook,
  textures: LookTextures,
  uniforms: PatternUniforms,
  patternMap: THREE.Texture | null,
  seed: number[]
) {
  applyPatternUniforms(uniforms, look, patternMap, seed);
  const glows = look.glow > 0;
  const lacquered = look.clearcoat > 0;
  const shimmers = look.iridescence > 0;
  const velvety = look.sheen > 0;
  const clear = look.transmission > 0;
  // Keeps the lacquer and the shimmer off the digits
  const bodyOnly = look.digitsCoated ? null : textures.surfaceMap;

  material.map = textures.map;
  material.normalMap = textures.normalMap;
  material.normalScale.set(look.engraving * 2, look.engraving * 2);
  // The roughness and the metalness are painted into the texture
  material.roughnessMap = textures.surfaceMap;
  material.metalnessMap = textures.surfaceMap;
  material.roughness = 1;
  material.metalness = 1;
  material.emissiveMap = glows ? textures.emissiveMap : null;
  material.emissive.set(glows ? "#ffffff" : "#000000");
  material.emissiveIntensity = look.glow * 2;
  material.specularIntensity = look.specular;
  material.specularColor.set(look.specularColor);
  material.envMapIntensity = look.reflections * 2;
  material.clearcoat = look.clearcoat;
  material.clearcoatRoughness = look.clearcoatRoughness;
  material.clearcoatMap = lacquered ? bodyOnly : null;
  material.iridescence = look.iridescence;
  material.iridescenceIOR = 1.8;
  material.iridescenceThicknessRange = [
    MIN_FILM_THICKNESS,
    MIN_FILM_THICKNESS +
      look.iridescenceHue * (MAX_FILM_THICKNESS - MIN_FILM_THICKNESS),
  ];
  material.iridescenceMap = shimmers ? bodyOnly : null;
  material.sheen = look.sheen;
  material.sheenColor.set(look.sheenColor);
  material.sheenRoughness = 0.5;
  material.transmission = look.transmission;
  // The digits of a die of glass stay solid
  material.transmissionMap = clear ? textures.surfaceMap : null;
  material.thickness = clear ? 2 : 0;
  material.attenuationColor.set(look.body);
  material.attenuationDistance = clear ? 0.3 : Infinity;

  // These turn features of the shader on and off: the program has to be built again
  const features = [
    glows,
    lacquered,
    shimmers,
    velvety,
    clear,
    look.digitsCoated,
  ].join();
  if (material.userData.features !== features) {
    material.userData.features = features;
    material.needsUpdate = true;
  }
}

/**
 * The material of custom dice: painted from the look the player put together
 * in the settings instead of coming from image files.
 * `dieId` tells a die of its own apart from the other dice of a roll.
 */
export function CustomMaterial({ dieId = "" }: { dieId?: string }) {
  const look = useDiceLook();
  const invalidate = useThree((state) => state.invalidate);

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

  // The family name of the font of the look once the browser has it, empty without a font
  // The loader isn't one of three.js, the types of useLoader don't know what it gives
  const fontFamily = useLoader(
    DiceFontLoader as unknown as typeof THREE.FileLoader,
    look.font
  ) as unknown as string;

  const textures = useMemo(
    () =>
      getLookTextures(
        look,
        maskImage,
        tenIconUrl ? tenIcon : undefined,
        oneIconUrl ? oneIcon : undefined,
        fontFamily || undefined
      ),
    [look, maskImage, tenIcon, oneIcon, tenIconUrl, oneIconUrl, fontFamily]
  );
  const patternMap = useMemo(
    () =>
      patternUrl && isTexturePattern(look.pattern)
        ? getPatternMap(look.pattern, pattern, maskImage)
        : null,
    [patternUrl, look.pattern, pattern, maskImage]
  );
  const seed = useMemo(
    () => getPatternSeed(dieId, look.unique),
    [dieId, look.unique]
  );

  const [material, uniforms] = useMemo(() => {
    const material = new THREE.MeshPhysicalMaterial();
    const uniforms = createPatternUniforms();
    installPatternShader(material, uniforms);
    return [material, uniforms] as const;
  }, []);
  useEffect(() => () => material.dispose(), [material]);
  useLayoutEffect(() => {
    applyLook(material, look, textures, uniforms, patternMap, seed);
    // The canvas only draws on demand and doesn't see changes made by hand
    invalidate();
  }, [material, uniforms, look, textures, patternMap, seed, invalidate]);

  return <primitive object={material} attach="material" />;
}
