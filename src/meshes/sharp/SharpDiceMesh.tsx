import React from "react";
import * as THREE from "three";
import { DiceType } from "../../types/DiceType";

import { D10 } from "./D10";

type Props = JSX.IntrinsicElements["group"] & { diceType: DiceType };

/** V20 only rolls D10, the meshes of the other dice of the original roller were removed */
export const SharpDiceMesh = React.forwardRef<THREE.Group, Props>(
  ({ diceType, ...props }, ref) => {
    if (diceType !== "D10") {
      throw Error(`Dice type ${diceType} error: not implemented`);
    }
    return <D10 ref={ref} {...props} />;
  }
);
