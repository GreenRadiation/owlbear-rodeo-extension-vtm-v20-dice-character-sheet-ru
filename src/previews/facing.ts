import * as THREE from "three";

/**
 * How a die is turned to show one of its faces to the camera with the digit
 * on it upright and the die itself not leaning to a side.
 *
 * `face` is the normal of the face on the mesh of the die, `camera` the
 * direction from the die to the camera. `up` is the direction on the die that
 * the top of the digit points to: for a D10 that is the axis of the die, the
 * digits of the upper faces point to the top apex and those of the lower
 * faces to the bottom one. `twist` is an extra turn in radians, for digits
 * that don't point exactly that way.
 */
export function getFacingQuaternion(
  face: THREE.Vector3,
  camera: THREE.Vector3,
  up: THREE.Vector3,
  twist = 0
): THREE.Quaternion {
  const toCamera = new THREE.Quaternion().setFromUnitVectors(
    face.clone().normalize(),
    camera.clone().normalize()
  );
  const c = camera.clone().normalize();
  // Where the up of the digit ends up, flattened against the view
  const digitUp = up.clone().applyQuaternion(toCamera);
  digitUp.addScaledVector(c, -digitUp.dot(c)).normalize();
  // Where it should be: straight up on the screen
  const screenUp = new THREE.Vector3(0, 1, 0);
  screenUp.addScaledVector(c, -screenUp.dot(c)).normalize();
  const angle = Math.atan2(
    new THREE.Vector3().crossVectors(digitUp, screenUp).dot(c),
    digitUp.dot(screenUp)
  );
  return new THREE.Quaternion()
    .setFromAxisAngle(c, angle + twist)
    .multiply(toCamera);
}

/** The faces of a D10 with the ten and the one, from the locators of its mesh (meshes/rounded/D10.tsx) */
export const TEN_FACE = new THREE.Vector3(0.4, 0.42, -0.56);
export const ONE_FACE = new THREE.Vector3(-0.7, -0.37, -0.22);
/** The digits of the upper faces of a D10 point to the top apex, those of the lower faces to the bottom one */
export const TEN_UP = new THREE.Vector3(0, 1, 0);
export const ONE_UP = new THREE.Vector3(0, -1, 0);
