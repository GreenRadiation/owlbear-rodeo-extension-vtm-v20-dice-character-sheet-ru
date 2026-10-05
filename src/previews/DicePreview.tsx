import { styled } from "@mui/material/styles";

import { DiceStyle, ImageDiceStyle } from "../types/DiceStyle";
import { getCurrentLook, useDiceControlsStore } from "../controls/store";
import { CustomDicePreview } from "./CustomDicePreview";
import { DiceType } from "../types/DiceType";

import * as galaxyPreviews from "./galaxy";
import * as gemstonePreviews from "./gemstone";
import * as glassPreviews from "./glass";
import * as ironPreviews from "./iron";
import * as nebulaPreviews from "./nebula";
import * as sunrisePreviews from "./sunrise";
import * as sunsetPreviews from "./sunset";
import * as walnutPreviews from "./walnut";

const previews: Record<ImageDiceStyle, Record<DiceType, string>> = {
  GALAXY: galaxyPreviews,
  GEMSTONE: gemstonePreviews,
  GLASS: glassPreviews,
  IRON: ironPreviews,
  NEBULA: nebulaPreviews,
  SUNRISE: sunrisePreviews,
  SUNSET: sunsetPreviews,
  WALNUT: walnutPreviews,
};

interface PreviewImageProps {
  size?: "small" | "medium" | "large";
}

const PreviewImage = styled("img", {
  shouldForwardProp: (prop) => prop !== "size",
})<PreviewImageProps>(({ size }) => ({
  width: size === "small" ? "28px" : size === "medium" ? "34px" : "38px",
  height: size === "small" ? "28px" : size === "medium" ? "34px" : "38px",
}));

type DiePreviewProps = {
  diceType: DiceType;
  diceStyle: DiceStyle;
  size?: "small" | "medium" | "large";
};

const SIZES = { small: 28, medium: 34, large: 38 };

export function DicePreview({ diceType, diceStyle, size }: DiePreviewProps) {
  // The custom dice shown in the interface are always the ones of this player
  const look = useDiceControlsStore(getCurrentLook);
  if (diceStyle === "CUSTOM") {
    return <CustomDicePreview look={look} size={SIZES[size || "large"]} />;
  }
  return (
    <PreviewImage
      src={previews[diceStyle][diceType]}
      alt={`${diceStyle} ${diceType} preview`}
      size={size}
    />
  );
}
