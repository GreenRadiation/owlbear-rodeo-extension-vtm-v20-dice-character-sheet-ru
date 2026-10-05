import { TrayMesh } from "../meshes/TrayMesh";
import { TrayMaterial } from "../materials/tray/TrayMaterial";

export function Tray(
  props: JSX.IntrinsicElements["group"] & {
    /** Width of the tray relative to the original tray */
    widthScale?: number;
  }
) {
  return (
    <TrayMesh {...props}>
      <TrayMaterial />
    </TrayMesh>
  );
}
