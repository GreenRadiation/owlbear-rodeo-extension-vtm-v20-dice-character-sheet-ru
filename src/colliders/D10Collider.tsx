import { useMemo } from "react";
import { ConvexHullCollider } from "@react-three/rapier";

import { useDiceScale } from "../dice/scale";
import { D10_VERTICES } from "./d10Vertices";

export function D10Collider() {
  const diceScale = useDiceScale();
  const vertices = useMemo(
    () => D10_VERTICES.map((n) => (n / 10) * diceScale),
    [diceScale]
  );

  return <ConvexHullCollider args={[vertices]} />;
}
