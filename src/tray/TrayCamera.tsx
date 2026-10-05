import { PerspectiveCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";

/** How high above the tray the camera is */
const CAMERA_HEIGHT = 4.3;
/**
 * How much of the scene the camera of the original roller sees along the tray:
 * the tray is 2 long, the rest is a margin. The same margin is kept across the tray.
 */
const VIEW_LENGTH = 2.144;

/**
 * Camera that looks straight down at a tray and fits it in the view.
 * A tray lying on its side is the same upright tray seen by a camera
 * that is turned a quarter of a circle.
 */
export function TrayCamera({
  trayWidth,
  landscape,
}: {
  /** Width of the model of the tray relative to the original tray */
  trayWidth: number;
  landscape?: boolean;
}) {
  const size = useThree((state) => state.size);
  const aspect = size.height > 0 ? size.width / size.height : 1;

  // What has to be seen across and along the view
  const trayViewWidth = (VIEW_LENGTH / 2) * trayWidth;
  const across = landscape ? VIEW_LENGTH : trayViewWidth;
  const along = landscape ? trayViewWidth : VIEW_LENGTH;
  // The field of view of a camera is vertical. Usually the view has the shape
  // of the tray. When it doesn't, for example right after the size of the
  // tray was changed in the settings with dice still in it, the tray is made
  // smaller to fit
  const viewHeight = Math.max(along, across / aspect);
  const fov = (2 * Math.atan(viewHeight / 2 / CAMERA_HEIGHT) * 180) / Math.PI;

  return (
    <PerspectiveCamera
      makeDefault
      fov={fov}
      position={[0, CAMERA_HEIGHT, 0]}
      rotation={[-Math.PI / 2, 0, landscape ? Math.PI / 2 : 0]}
    />
  );
}
