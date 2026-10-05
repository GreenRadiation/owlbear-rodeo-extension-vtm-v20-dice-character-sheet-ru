import { useThree } from "@react-three/fiber";

/** Development only: gives the console the scene of the tray through `window.v20.scene` */
export function ExposeScene() {
  const scene = useThree((state) => state.scene);
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  if (import.meta.env.DEV) {
    const debug = window as unknown as { v20?: Record<string, unknown> };
    if (debug.v20) {
      debug.v20.scene = scene;
      debug.v20.gl = gl;
      debug.v20.camera = camera;
    }
  }
  return null;
}
