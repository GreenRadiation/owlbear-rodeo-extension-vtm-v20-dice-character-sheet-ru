import { D10_VERTICES } from "../colliders/d10Vertices";
import { DiceQuaternion } from "../types/DiceQuaternion";
import { DiceVector3 } from "../types/DiceVector3";

/**
 * How far the top face of a die can lean from horizontal and still count as lying flat.
 * Generous on purpose: a die that touches its neighbour and leans a little is easy
 * to read, only dice that really lie on something need to be moved.
 */
const FLAT_TOLERANCE_DEGREES = 10;
const FLAT_MIN_UP = Math.cos((FLAT_TOLERANCE_DEGREES * Math.PI) / 180);

function sub(a: DiceVector3, b: DiceVector3): DiceVector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function cross(a: DiceVector3, b: DiceVector3): DiceVector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function dot(a: DiceVector3, b: DiceVector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function normalize(a: DiceVector3): DiceVector3 {
  const length = Math.sqrt(dot(a, a));
  return { x: a.x / length, y: a.y / length, z: a.z / length };
}

/**
 * Outward normals of the ten faces of the D10 collider.
 * The D10 is a pentagonal trapezohedron: two apexes and two rings of five corners.
 * Every face is a kite made of an apex, two neighbouring corners of the ring on
 * the apex's side and a corner of the other ring.
 */
function getFaceNormals(): DiceVector3[] {
  const points: DiceVector3[] = [];
  for (let i = 0; i < D10_VERTICES.length; i += 3) {
    points.push({
      x: D10_VERTICES[i],
      y: D10_VERTICES[i + 1],
      z: D10_VERTICES[i + 2],
    });
  }
  const byHeight = [...points].sort((a, b) => b.y - a.y);
  const top = byHeight[0];
  const bottom = byHeight[byHeight.length - 1];
  const rings = byHeight.slice(1, -1);
  const byAngle = (a: DiceVector3, b: DiceVector3) =>
    Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x);
  const upperRing = rings.filter((p) => p.y > 0).sort(byAngle);
  const lowerRing = rings.filter((p) => p.y < 0).sort(byAngle);

  const normals: DiceVector3[] = [];
  const addFaces = (apex: DiceVector3, ring: DiceVector3[]) => {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      let normal = normalize(cross(sub(a, apex), sub(b, apex)));
      // The die is centered on the origin so an outward normal points the same way as the face
      if (dot(normal, apex) < 0) {
        normal = { x: -normal.x, y: -normal.y, z: -normal.z };
      }
      normals.push(normal);
    }
  };
  addFaces(top, upperRing);
  addFaces(bottom, lowerRing);
  return normals;
}

const faceNormals = getFaceNormals();

/**
 * Where the numbers of the D10 are: the positions of the locators of its meshes
 * (see meshes/rounded/D10.tsx), the index is the number on the face.
 * The "0" face is the ten.
 */
const NUMBER_LOCATORS: [number, number, number][] = [
  [0.4, 0.42, -0.56],
  [-0.7, -0.37, -0.22],
  [0.01, 0.42, 0.69],
  [0.69, -0.37, -0.23],
  [-0.41, 0.42, -0.55],
  [0.44, -0.37, 0.59],
  [-0.65, 0.42, 0.22],
  [-0.01, -0.37, -0.73],
  [0.66, 0.42, 0.21],
  [-0.42, -0.37, 0.6],
];

/** The number on every face, in the order of the normals of the faces */
export const faceNumbers = faceNormals.map((normal) => {
  let best = 0;
  let bestDot = -Infinity;
  NUMBER_LOCATORS.forEach(([x, y, z], number) => {
    const length = Math.sqrt(x * x + y * y + z * z);
    const alignment = (normal.x * x + normal.y * y + normal.z * z) / length;
    if (alignment > bestDot) {
      bestDot = alignment;
      best = number;
    }
  });
  return best;
});

/** Rotate a vector by a quaternion */
function rotate(v: DiceVector3, q: DiceQuaternion): DiceVector3 {
  const { x, y, z, w } = q;
  return {
    x:
      (1 - 2 * (y * y + z * z)) * v.x +
      2 * (x * y - w * z) * v.y +
      2 * (x * z + w * y) * v.z,
    y:
      2 * (x * y + w * z) * v.x +
      (1 - 2 * (x * x + z * z)) * v.y +
      2 * (y * z - w * x) * v.z,
    z:
      2 * (x * z - w * y) * v.x +
      2 * (y * z + w * x) * v.y +
      (1 - 2 * (x * x + y * y)) * v.z,
  };
}

/** The world space normal of the face of the die that looks up the most */
export function getD10TopFaceNormal(rotation: DiceQuaternion): DiceVector3 {
  let top = rotate(faceNormals[0], rotation);
  for (let i = 1; i < faceNormals.length; i++) {
    const normal = rotate(faceNormals[i], rotation);
    if (normal.y > top.y) {
      top = normal;
    }
  }
  return top;
}

/**
 * The number on the face of the die that looks up the most: 0 to 9, the 0 is the ten.
 * Only needs the rotation of the physics body, not the mesh that is drawn.
 */
export function getD10Value(rotation: DiceQuaternion): number {
  let top = 0;
  let highest = -Infinity;
  for (let i = 0; i < faceNormals.length; i++) {
    const up = rotate(faceNormals[i], rotation).y;
    if (up > highest) {
      highest = up;
      top = i;
    }
  }
  return faceNumbers[top];
}

/**
 * How much the face of the die that looks up the most is aligned with the up direction.
 * 1 for a die lying flat on the tray, less for a die leaning on a wall or another die.
 */
export function getD10Flatness(rotation: DiceQuaternion): number {
  return getD10TopFaceNormal(rotation).y;
}

/** True if one of the faces of the die is level: the die lies flat and not leaning on something */
export function isD10Flat(rotation: DiceQuaternion): boolean {
  return getD10Flatness(rotation) >= FLAT_MIN_UP;
}

/** True if the die has come to rest without lying flat on one of its faces */
export function isD10Cocked(rotation: DiceQuaternion): boolean {
  return !isD10Flat(rotation);
}
