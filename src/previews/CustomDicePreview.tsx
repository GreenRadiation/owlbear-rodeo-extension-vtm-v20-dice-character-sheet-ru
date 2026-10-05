import { useId } from "react";

import { DiceLook } from "../dice/look";

/**
 * A flat picture of custom dice for buttons: the colors of the body and of the digits.
 * The other dice have rendered images, custom dice change with every setting.
 */
export function CustomDicePreview({
  look,
  size,
}: {
  look: DiceLook;
  /** Width and height in pixels */
  size: number;
}) {
  const id = useId();
  const patterned = look.pattern !== "solid" && look.patternStrength > 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="свои кубы"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.2" stopColor={look.body} />
          <stop offset="1" stopColor={patterned ? look.body2 : look.body} />
        </linearGradient>
      </defs>
      {/* The outline of a D10 seen from above one of its faces */}
      <polygon
        points="50,4 94,36 88,70 50,96 12,70 6,36"
        fill={`url(#${id})`}
        stroke="rgba(0, 0, 0, 0.5)"
        strokeWidth="2"
      />
      <polygon
        points="50,10 78,58 50,76 22,58"
        fill="rgba(255, 255, 255, 0.12)"
      />
      <text
        x="50"
        y="60"
        textAnchor="middle"
        fontSize="38"
        fontWeight="700"
        fontFamily="Roboto, sans-serif"
        fill={look.tenColor || look.digits}
      >
        0
      </text>
    </svg>
  );
}
