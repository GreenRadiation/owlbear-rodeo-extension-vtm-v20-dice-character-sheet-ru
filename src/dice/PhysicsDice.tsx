import * as THREE from "three";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CollisionEnterPayload,
  RigidBody,
  RapierRigidBody,
  useAfterPhysicsStep,
} from "@react-three/rapier";

import { Die } from "../types/Die";
import { getValueFromDiceGroup } from "../helpers/getValueFromDiceGroup";
import { useFrame } from "@react-three/fiber";
import { useAudioListener } from "../audio/AudioListenerProvider";
import { getNextBuffer } from "../audio/getAudioBuffer";
import { PhysicalMaterial } from "../types/PhysicalMaterial";
import { getDieWeightClass } from "../helpers/getDieWeightClass";
import { getDieDensity } from "../helpers/getDieDensity";
import { DiceThrow } from "../types/DiceThrow";
import { DiceTransform } from "../types/DiceTransform";
import { DiceCollider } from "../colliders/DiceCollider";
import { getD10TopFaceNormal, isD10Cocked } from "../helpers/d10Faces";

/** Minium linear and angular speed before the dice roll is considered finished */
const MIN_ROLL_FINISHED_SPEED = 0.005;
/** Cool down in MS before dice audio can get played again */
const AUDIO_COOLDOWN = 200;
/** Force stop the physics roll after 8 seconds */
const MAX_ROLL_TIME = 8000;
/** How many times a die that came to rest leaning on something gets pushed to lie flat */
const MAX_NUDGES = 4;
/** Upwards speed of a nudge */
const NUDGE_HOP_SPEED = 1.6;
/** Sideways speed of a nudge */
const NUDGE_SLIDE_SPEED = 0.9;
/** Spin of a nudge */
const NUDGE_SPIN_SPEED = 6;
/** How much stronger every next nudge of the same die is */
const NUDGE_ESCALATION = 0.35;
/** How much every next nudge of the same die turns away from the previous direction, in radians */
const NUDGE_TURN = 1.2;

function magnitude({ x, y, z }: { x: number; y: number; z: number }) {
  return Math.sqrt(x * x + y * y + z * z);
}

type Vector3Array = [number, number, number];

export function PhysicsDice({
  die,
  dieThrow,
  onRollFinished,
  children,
  fixedTransform,
  ...props
}: JSX.IntrinsicElements["group"] & {
  die: Die;
  dieThrow: DiceThrow;
  onRollFinished?: (
    id: string,
    number: number,
    transform: DiceTransform
  ) => void;
  fixedTransform?: DiceTransform;
}) {
  const ref = useRef<THREE.Group>(null);
  const rigidBodyRef = useRef<RapierRigidBody>(null);

  // Convert dice throw into THREE values
  const [position] = useState<Vector3Array>(() => {
    const p = fixedTransform ? fixedTransform.position : dieThrow.position;
    return [p.x, p.y, p.z];
  });

  const [rotation] = useState<Vector3Array>(() => {
    const r = fixedTransform ? fixedTransform.rotation : dieThrow.rotation;
    const quaternion = new THREE.Quaternion(r.x, r.y, r.z, r.w);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return [euler.x, euler.y, euler.z];
  });

  const [linearVelocity] = useState<Vector3Array>(() => {
    const v = fixedTransform ? { x: 0, y: 0, z: 0 } : dieThrow.linearVelocity;
    return [v.x, v.y, v.z];
  });

  const [angularVelocity] = useState<Vector3Array>(() => {
    const v = fixedTransform ? { x: 0, y: 0, z: 0 } : dieThrow.angularVelocity;
    return [v.x, v.y, v.z];
  });

  const lockedRef = useRef(false);
  const lockDice = useCallback(() => {
    const rigidBody = rigidBodyRef.current;
    if (rigidBody) {
      // Disable rigid body rotation and translation
      // This stops the dice from getting changed after it has finished rolling
      rigidBody.setEnabledRotations(false, false, false, false);
      rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, false);
      rigidBody.setEnabledTranslations(false, false, false, false);
      rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, false);
      lockedRef.current = true;
    }
  }, []);

  /**
   * Dice in a big pool can come to rest leaning on each other or on a wall
   * which makes it hard to tell what face is up.
   * When that happens hop the die away from what it leans on so it lands flat.
   * This runs inside the physics step and only uses the state of the simulation
   * so every player watching the roll simulates the exact same nudge.
   * The nudge doesn't depend on the numbers of the die so the roll stays fair.
   */
  const nudgesRef = useRef(0);
  useAfterPhysicsStep(() => {
    const rigidBody = rigidBodyRef.current;
    if (
      !rigidBody ||
      lockedRef.current ||
      fixedTransform ||
      nudgesRef.current >= MAX_NUDGES
    ) {
      return;
    }
    const speed = magnitude(rigidBody.linvel()) + magnitude(rigidBody.angvel());
    const position = rigidBody.translation();
    if (
      speed < MIN_ROLL_FINISHED_SPEED &&
      position.y < 1.5 &&
      isD10Cocked(rigidBody.rotation())
    ) {
      const attempt = nudgesRef.current;
      nudgesRef.current += 1;
      if (import.meta.env.DEV) {
        // Count the nudges to be able to tune them from the browser console
        const debug = window as unknown as { diceNudges?: number };
        debug.diceNudges = (debug.diceNudges || 0) + 1;
      }
      // The top face of a leaning die tilts away from what the die leans on
      // so its normal shows the way downhill
      const normal = getD10TopFaceNormal(rigidBody.rotation());
      let x = normal.x;
      let z = normal.z;
      let length = Math.sqrt(x * x + z * z);
      if (length < 0.05) {
        // No clear direction: go to the center of the tray
        x = -position.x;
        z = -position.z;
        length = Math.sqrt(x * x + z * z);
      }
      if (length < 0.01) {
        x = 1;
        z = 0;
        length = 1;
      }
      x /= length;
      z /= length;
      // A die that is still stuck after a nudge is wedged between other dice:
      // push harder and turn the direction a bit more with every attempt
      const strength = 1 + attempt * NUDGE_ESCALATION;
      const turn = attempt * NUDGE_TURN;
      const turnedX = x * Math.cos(turn) - z * Math.sin(turn);
      const turnedZ = x * Math.sin(turn) + z * Math.cos(turn);
      x = turnedX;
      z = turnedZ;
      rigidBody.setLinvel(
        {
          x: x * NUDGE_SLIDE_SPEED * strength,
          y: NUDGE_HOP_SPEED * strength,
          z: z * NUDGE_SLIDE_SPEED * strength,
        },
        true
      );
      // Spin around the horizontal axis perpendicular to the direction of the hop
      rigidBody.setAngvel(
        { x: z * NUDGE_SPIN_SPEED, y: 0, z: -x * NUDGE_SPIN_SPEED },
        true
      );
    }
  });

  const checkRollFinished = useCallback(
    (ignorePhysics?: boolean) => {
      const rigidBody = rigidBodyRef.current;
      const group = ref.current;
      if (rigidBody && !lockedRef.current && group) {
        // Get the total speed for the dice
        const linVel = rigidBody.linvel();
        const angVel = rigidBody.angvel();
        const speed = magnitude(linVel) + magnitude(angVel);
        // Ensure that the dice is in the tray
        const validPosition = rigidBody.translation().y < 1.5;
        // A die that isn't lying flat is about to get nudged by the physics step
        const settled =
          nudgesRef.current >= MAX_NUDGES ||
          !isD10Cocked(rigidBody.rotation());
        if (
          ignorePhysics ||
          (speed < MIN_ROLL_FINISHED_SPEED && validPosition && settled)
        ) {
          const value = getValueFromDiceGroup(group);
          const position = rigidBody.translation();
          const rotation = rigidBody.rotation();
          const transform = {
            position: { x: position.x, y: position.y, z: position.z },
            rotation: {
              x: rotation.x,
              y: rotation.y,
              z: rotation.z,
              w: rotation.w,
            },
          };
          onRollFinished?.(die.id, value, transform);
          lockDice();
        }
      }
    },
    [die.id, lockDice]
  );

  const handleFrame = useCallback(() => {
    checkRollFinished();
  }, [checkRollFinished]);
  useFrame(handleFrame);

  // Lock the dice when we have a manual transform
  useEffect(() => {
    if (fixedTransform) {
      lockDice();
    }
  }, [fixedTransform]);

  // Stop the roll if over the max roll time
  useEffect(() => {
    let timeout = setTimeout(() => {
      if (!lockedRef.current) {
        console.warn("Roll exceeded max roll time: stopping dice");
        checkRollFinished(true);
      }
    }, MAX_ROLL_TIME);

    return () => {
      clearTimeout(timeout);
    };
  }, [checkRollFinished]);

  const listener = useAudioListener();
  const lastAudioTimeRef = useRef(0);
  const handleCollision = useCallback(
    ({ rigidBodyObject }: CollisionEnterPayload) => {
      if (performance.now() - lastAudioTimeRef.current < AUDIO_COOLDOWN) {
        return;
      }
      const group = ref.current;
      // TODO: remove conditional when this gets merged https://github.com/pmndrs/react-three-rapier/pull/151/commits
      const physicalMaterial: PhysicalMaterial =
        rigidBodyObject?.userData?.material || "LEATHER";
      const linvel = rigidBodyRef.current?.linvel();
      if (group && physicalMaterial && linvel) {
        const speed = magnitude(linvel);
        const weightClass = getDieWeightClass(die);
        const buffer = getNextBuffer(weightClass, physicalMaterial);
        if (buffer && listener) {
          const sound = new THREE.PositionalAudio(listener);
          sound.setBuffer(buffer);
          sound.setRefDistance(3);
          sound.play();
          // Modulate sound volume based off of the speed of the colliding dice
          sound.setVolume(Math.min(speed / 5, 1));
          sound.onEnded = () => {
            group.remove(sound);
          };
          group.add(sound);
          lastAudioTimeRef.current = performance.now();
        }
      }
    },
    []
  );

  const userData = useMemo(
    () => ({ material: "DICE", dieId: die.id }),
    [die.id]
  );

  return (
    <RigidBody
      // Increase gravity on the dice to offset the non-standard dice size.
      // Dice are around 10x larger then they should be to account for
      // physics errors when shown at proper size.
      gravityScale={2}
      density={getDieDensity(die)}
      friction={0.1}
      position={position}
      rotation={rotation}
      linearVelocity={linearVelocity}
      angularVelocity={angularVelocity}
      ref={rigidBodyRef}
      onCollisionEnter={handleCollision}
      userData={userData}
    >
      <group ref={ref} {...props}>
        <DiceCollider diceType={die.type} />
        {children}
      </group>
    </RigidBody>
  );
}
