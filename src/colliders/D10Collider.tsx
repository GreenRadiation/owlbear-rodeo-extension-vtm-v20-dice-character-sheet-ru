import { ConvexHullCollider } from "@react-three/rapier";

import { DICE_SCALE } from "../dice/scale";
import { D10_VERTICES } from "./d10Vertices";

const vertices = D10_VERTICES.map((n) => (n / 10) * DICE_SCALE);

export function D10Collider() {
  return <ConvexHullCollider args={[vertices]} />;
}
