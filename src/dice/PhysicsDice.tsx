import * as THREE from "three";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CollisionEnterPayload,
  RigidBody,
  RapierRigidBody,
  useAfterPhysicsStep,
} from "@react-three/rapier";

import { Die } from "../types/Die";
import { useAudioListener } from "../audio/AudioListenerProvider";
import { getNextBuffer } from "../audio/getAudioBuffer";
import { PhysicalMaterial } from "../types/PhysicalMaterial";
import { getDieWeightClass } from "../helpers/getDieWeightClass";
import { getDieDensity } from "../helpers/getDieDensity";
import { DiceThrow } from "../types/DiceThrow";
import { DiceTransform } from "../types/DiceTransform";
import { DiceCollider } from "../colliders/DiceCollider";
import { PHYSICS_TIME_STEP } from "./timing";
import {
  getD10TopFaceNormal,
  getD10Value,
  isD10Flat,
} from "../helpers/d10Faces";

/** Minium linear and angular speed before the dice roll is considered finished */
const MIN_ROLL_FINISHED_SPEED = 0.005;
/** Cool down in MS before dice audio can get played again */
const AUDIO_COOLDOWN = 200;
/**
 * Force stop the physics roll after 6 seconds of simulated time.
 * Counted in physics steps and not by the clock: the physics of a window
 * that isn't visible can run late and stopping them early leaves the dice
 * hanging in the air.
 */
const MAX_ROLL_STEPS = Math.round(6 / PHYSICS_TIME_STEP);
/**
 * A die that lies flat and moves slower than this for a while is done.
 * Dice that touch each other can tremble for seconds without ever getting
 * under the minimum speed, there is no point in waiting for them.
 */
const SETTLE_LINEAR_SPEED = 0.03;
const SETTLE_ANGULAR_SPEED = 0.15;
/** Physics steps a die has to stay settled for: a quarter of a second */
const SETTLE_STEPS = Math.round(0.25 / PHYSICS_TIME_STEP);
/**
 * A die that isn't flat and moves slower than this for a while has come to rest
 * leaning on something. A tumbling die also gets this slow for a moment when it
 * tips over an edge, hence the wait.
 */
const LEAN_SPEED = 0.03;
/** Physics steps a die has to stay that slow for: a tenth of a second */
const LEAN_STEPS = Math.round(0.1 / PHYSICS_TIME_STEP);
/** How many times a die that came to rest leaning on something gets hopped away from it */
const MAX_NUDGES = 3;
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

/** Count something in development to be able to tune the physics from the browser console */
function countDebug(name: "diceNudges") {
  if (import.meta.env.DEV) {
    const debug = window as unknown as Record<string, number | undefined>;
    debug[name] = (debug[name] || 0) + 1;
  }
}

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
   *
   * A die that leans a lot is hopped away from what it leans on so it lands flat.
   * A die that only leans a little is left alone: its top face is easy to read
   * and rerolling a die that looks fine feels unfair.
   *
   * A die is done when it lies flat and has been almost still for a moment.
   * Waiting for it to stop completely takes seconds when dice touch and tremble.
   *
   * All of this runs inside the physics step and only uses the state of the
   * simulation: every player watching the roll simulates the exact same thing,
   * and nothing waits for a frame to be drawn, which browsers stop doing for
   * windows that aren't visible.
   * None of it depends on the numbers of the die so the roll stays fair.
   */
  const nudgesRef = useRef(0);
  /** Physics steps the die has been at rest without lying flat for */
  const leanStepsRef = useRef(0);
  /** Physics steps the die has been lying flat and almost still for */
  const settledStepsRef = useRef(0);
  /** Physics steps since the die was thrown */
  const stepsRef = useRef(0);

  // Use the latest callback without restarting the roll when it changes
  const onRollFinishedRef = useRef(onRollFinished);
  onRollFinishedRef.current = onRollFinished;

  /** Report the value of the die and stop it from moving again */
  const finishRoll = useCallback(() => {
    const rigidBody = rigidBodyRef.current;
    if (!rigidBody || lockedRef.current) {
      return;
    }
    const position = rigidBody.translation();
    const rotation = rigidBody.rotation();
    const transform = {
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
    };
    onRollFinishedRef.current?.(die.id, getD10Value(rotation), transform);
    lockDice();
  }, [die.id, lockDice]);

  const nudge = useCallback((rigidBody: RapierRigidBody) => {
    const attempt = nudgesRef.current;
    nudgesRef.current += 1;
    countDebug("diceNudges");
    const position = rigidBody.translation();
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
  }, []);

  useAfterPhysicsStep(() => {
    const rigidBody = rigidBodyRef.current;
    if (!rigidBody || lockedRef.current || fixedTransform) {
      return;
    }
    stepsRef.current += 1;
    if (stepsRef.current >= MAX_ROLL_STEPS) {
      console.warn("Roll exceeded max roll time: stopping dice");
      finishRoll();
      return;
    }
    const rotation = rigidBody.rotation();
    const linearSpeed = magnitude(rigidBody.linvel());
    const angularSpeed = magnitude(rigidBody.angvel());
    // Ensure that the dice is in the tray
    const inTray = rigidBody.translation().y < 1.5;

    if (isD10Flat(rotation)) {
      leanStepsRef.current = 0;
      if (!inTray) {
        settledStepsRef.current = 0;
      } else if (linearSpeed + angularSpeed < MIN_ROLL_FINISHED_SPEED) {
        finishRoll();
      } else if (
        linearSpeed < SETTLE_LINEAR_SPEED &&
        angularSpeed < SETTLE_ANGULAR_SPEED
      ) {
        settledStepsRef.current += 1;
        if (settledStepsRef.current >= SETTLE_STEPS) {
          finishRoll();
        }
      } else {
        settledStepsRef.current = 0;
      }
      return;
    }

    settledStepsRef.current = 0;
    if (!inTray || linearSpeed + angularSpeed >= LEAN_SPEED) {
      leanStepsRef.current = 0;
      return;
    }
    leanStepsRef.current += 1;
    if (leanStepsRef.current >= LEAN_STEPS) {
      leanStepsRef.current = 0;
      // Came to rest leaning on something
      if (nudgesRef.current < MAX_NUDGES) {
        nudge(rigidBody);
      } else {
        // Nothing helped, the die stays as it is
        finishRoll();
      }
    }
  });

  // Lock the dice when we have a manual transform
  useEffect(() => {
    if (fixedTransform) {
      lockDice();
    }
  }, [fixedTransform]);

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
