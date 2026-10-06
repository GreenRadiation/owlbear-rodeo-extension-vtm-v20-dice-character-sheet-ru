import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useLoader, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { RGBELoader } from "three-stdlib";

import environment from "../environment.hdr";

/**
 * The light of the tray and of every preview of dice: the environment of the
 * original roller, turned so that its light doesn't fall straight from above.
 * With the light right above the tray and the camera right above it too, the
 * reflection of the light sits in the middle of the top face of every die.
 * The angle was picked by the author of the extension in a real tray
 * (2026-10-06) and is the same for everyone.
 */

/** How far from straight above the light comes, in degrees */
const LIGHT_TILT = 29;
/** From which side, in degrees clockwise from the top of an upright tray */
const LIGHT_TURN = 45;
export function TrayEnvironment() {
  const source = useLoader(RGBELoader, environment, (loader) =>
    loader.setDataType(THREE.FloatType)
  ) as THREE.DataTexture;
  const map = useMemo(() => {
    // The loader gives a plain texture, the panorama has to be read as one
    source.mapping = THREE.EquirectangularReflectionMapping;
    return getTiltedEnvironment(source, LIGHT_TILT, LIGHT_TURN);
  }, [source]);
  // A canvas that only draws on demand has to be told the light changed
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [map, invalidate]);
  return <Environment map={map} />;
}

const cache = new Map<string, THREE.DataTexture>();

/**
 * The environment with its zenith moved `tilt` degrees towards the direction
 * `turn` degrees around the tray. The image is a panorama: every pixel of the
 * result is looked up in the source along the turned direction.
 */
export function getTiltedEnvironment(
  source: THREE.DataTexture,
  tilt: number,
  turn: number
): THREE.DataTexture {
  if (tilt === 0) {
    return source;
  }
  const key = `${source.uuid}|${tilt}|${turn}`;
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const { width, height } = source.image;
  const input = source.image.data as unknown as Float32Array;
  const output = new Float32Array(input.length);
  const turnRadians = (turn * Math.PI) / 180;
  // The axis the sky is turned around lies flat, the zenith moves away from it
  const axis = new THREE.Vector3(
    Math.cos(turnRadians),
    0,
    Math.sin(turnRadians)
  );
  const rotation = new THREE.Quaternion()
    .setFromAxisAngle(axis, (-tilt * Math.PI) / 180)
    .invert();
  const direction = new THREE.Vector3();

  for (let y = 0; y < height; y++) {
    const latitude = ((y + 0.5) / height - 0.5) * Math.PI;
    for (let x = 0; x < width; x++) {
      const longitude = ((x + 0.5) / width - 0.5) * Math.PI * 2;
      // The panorama as three.js reads it: around the Y axis, bottom row looking down
      direction.set(
        Math.cos(latitude) * Math.cos(longitude),
        Math.sin(latitude),
        Math.cos(latitude) * Math.sin(longitude)
      );
      direction.applyQuaternion(rotation);
      const u =
        (Math.atan2(direction.z, direction.x) / (Math.PI * 2) + 0.5) * width -
        0.5;
      const v =
        (Math.asin(Math.min(1, Math.max(-1, direction.y))) / Math.PI + 0.5) *
          height -
        0.5;
      sample(input, width, height, u, v, output, (y * width + x) * 4);
    }
  }

  const texture = new THREE.DataTexture(
    output,
    width,
    height,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = source.colorSpace;
  texture.flipY = source.flipY;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  cache.set(key, texture);
  return texture;
}

/** Bilinear lookup that wraps around the sides of the panorama */
function sample(
  input: Float32Array,
  width: number,
  height: number,
  u: number,
  v: number,
  output: Float32Array,
  at: number
) {
  const x0 = Math.floor(u);
  const y0 = Math.min(height - 2, Math.max(0, Math.floor(v)));
  const fx = u - x0;
  const fy = Math.min(1, Math.max(0, v - y0));
  const xa = ((x0 % width) + width) % width;
  const xb = (xa + 1) % width;
  for (let channel = 0; channel < 4; channel++) {
    const top =
      input[(y0 * width + xa) * 4 + channel] * (1 - fx) +
      input[(y0 * width + xb) * 4 + channel] * fx;
    const bottom =
      input[((y0 + 1) * width + xa) * 4 + channel] * (1 - fx) +
      input[((y0 + 1) * width + xb) * 4 + channel] * fx;
    output[at + channel] = top * (1 - fy) + bottom * fy;
  }
}
