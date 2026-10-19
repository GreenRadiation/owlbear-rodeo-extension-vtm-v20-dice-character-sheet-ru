import Box from "@mui/material/Box";
import { SxProps, Theme } from "@mui/material/styles";

/**
 * An icon from an SVG file of the `icons` folder, drawn in the current text
 * color: the file is used as a mask, so only its shape matters.
 * Any single-color SVG works, see the README in that folder.
 */
export function FileIcon({
  src,
  size = 24,
  sx,
}: {
  src: string;
  /** Width and height in pixels */
  size?: number;
  sx?: SxProps<Theme>;
}) {
  const mask = `url("${src}") center / contain no-repeat`;
  return (
    <Box
      component="span"
      aria-hidden
      sx={[
        {
          display: "inline-block",
          width: size,
          height: size,
          flexShrink: 0,
          bgcolor: "currentColor",
          WebkitMask: mask,
          mask,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}
