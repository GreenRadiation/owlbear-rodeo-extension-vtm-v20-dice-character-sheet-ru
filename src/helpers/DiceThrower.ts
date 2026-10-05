import { DiceThrow } from "../types/DiceThrow";
import { DiceQuaternion } from "../types/DiceQuaternion";
import { DiceVector3 } from "../types/DiceVector3";

import { random } from "./random";

const MIN_X = -0.3;
const MAX_X = 0.3;
const MIN_Y = 1;
const MAX_Y = 1.2;
const MIN_Z = -0.8;
const MAX_Z = 0.8;
const MIN_TARGET_X = -0.25;
const MAX_TARGET_X = 0.25;
const MIN_TARGET_Z = -0.7;
const MAX_TARGET_Z = 0.7;
const MIN_LAUNCH_VELOCITY = 1;
const MAX_LAUNCH_VELOCITY = 2;
const MIN_ANGULAR_VELOCITY = 2;
const MAX_ANGULAR_VELOCITY = 6;
/** Closest two dice of the original size can start to each other, a bit more than the size of a die */
const MIN_DISTANCE = 0.27;
/** How much higher dice can start for every bit of size over the original one */
const EXTRA_HEIGHT = 2;

/**
 * `trayWidth` is the width of the tray relative to the original tray,
 * `diceScale` the size of the dice relative to the original dice.
 * Bigger dice start in a taller space: there are less ways to put them
 * side by side without touching.
 */
export function randomPosition(trayWidth = 1, diceScale = 1): DiceVector3 {
  return {
    x: random(MIN_X, MAX_X) * trayWidth,
    y: random(MIN_Y, MAX_Y + Math.max(0, diceScale - 1) * EXTRA_HEIGHT),
    z: random(MIN_Z, MAX_Z),
  };
}

/** Adapted from https://stackoverflow.com/a/56794499 */
export function randomRotation(): DiceQuaternion {
  let x, y, z, u, v, w, s;
  do {
    x = random(-1, 1);
    y = random(-1, 1);
    z = x * x + y * y;
  } while (z > 1);
  do {
    u = random(-1, 1);
    v = random(-1, 1);
    w = u * u + v * v;
  } while (w > 1);
  s = Math.sqrt((1 - z) / w);
  return {
    x,
    y,
    z: s * u,
    w: s * v,
  };
}

/**
 * Get a random launch velocity for the dice
 * Launches from where the dice is towards a random point of the tray.
 * Aiming every die at the center of the tray makes the dice of a big pool
 * pile up on each other.
 */
export function randomLinearVelocity(
  position: DiceVector3,
  speedMultiplier?: number,
  trayWidth = 1
): DiceVector3 {
  // Only use the horizontal plane
  const x = position.x - random(MIN_TARGET_X, MAX_TARGET_X) * trayWidth;
  const z = position.z - random(MIN_TARGET_Z, MAX_TARGET_Z);
  // Normalize to get the direction from the target to the die
  const length = Math.sqrt(x * x + z * z);
  if (isNaN(length) || length === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  const norm: DiceVector3 = { x: x / length, y: 0, z: z / length };
  // Generate a random speed
  const speed =
    random(MIN_LAUNCH_VELOCITY, MAX_LAUNCH_VELOCITY) * (speedMultiplier || 1);
  // Map the speed to the normalized direction and reverse it so it
  // goes inwards instead of outwards
  const velocity: DiceVector3 = {
    x: norm.x * speed * -1,
    y: norm.y * speed * -1,
    z: norm.z * speed * -1,
  };

  return velocity;
}

export function randomLinearVelocityFromDirection(
  direction: DiceVector3,
  speedMultiplier?: number
): DiceVector3 {
  const speed =
    random(MIN_LAUNCH_VELOCITY, MAX_LAUNCH_VELOCITY) * (speedMultiplier || 1);
  const velocity: DiceVector3 = {
    x: direction.x * speed,
    y: direction.y * speed,
    z: direction.z * speed,
  };

  return velocity;
}

export function randomAngularVelocity(): DiceVector3 {
  return {
    x: random(MIN_ANGULAR_VELOCITY, MAX_ANGULAR_VELOCITY),
    y: random(MIN_ANGULAR_VELOCITY, MAX_ANGULAR_VELOCITY),
    z: random(MIN_ANGULAR_VELOCITY, MAX_ANGULAR_VELOCITY),
  };
}

export function getRandomDiceThrow(
  speedMultiplier?: number,
  trayWidth = 1
): DiceThrow {
  const position = randomPosition(trayWidth);
  const rotation = randomRotation();
  const linearVelocity = randomLinearVelocity(
    position,
    speedMultiplier,
    trayWidth
  );
  const angularVelocity = randomAngularVelocity();
  return {
    position,
    rotation,
    linearVelocity,
    angularVelocity,
  };
}

/** A dice thrower that keeps a history of previous dice to avoid collisions */
export class DiceThrower {
  private history: DiceThrow[] = [];

  /**
   * `trayWidth` is the width of the tray relative to the original tray,
   * `diceScale` the size of the dice relative to the original dice
   */
  constructor(private trayWidth = 1, private diceScale = 1) {}

  private isPositionValid(position: DiceVector3) {
    for (const diceThrow of this.history) {
      const a = position;
      const b = diceThrow.position;
      const delta: DiceVector3 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
      const lenSquared =
        delta.x * delta.x + delta.y * delta.y + delta.z * delta.z;
      const distance = Math.sqrt(lenSquared);
      if (distance < MIN_DISTANCE * Math.max(1, this.diceScale)) {
        return false;
      }
    }
    return true;
  }

  getDiceThrow(index: number, speedMultiplier?: number): DiceThrow {
    if (this.history.length > index) {
      return this.history[index];
    }
    let position = randomPosition(this.trayWidth, this.diceScale);
    for (let i = 0; i < 50; i++) {
      if (this.isPositionValid(position)) {
        break;
      }
      position = randomPosition(this.trayWidth, this.diceScale);
    }
    const rotation = randomRotation();
    const linearVelocity = randomLinearVelocity(
      position,
      speedMultiplier,
      this.trayWidth
    );
    const angularVelocity = randomAngularVelocity();

    const diceThrow: DiceThrow = {
      position,
      rotation,
      linearVelocity,
      angularVelocity,
    };

    this.history.push(diceThrow);

    return diceThrow;
  }

  clearHistory() {
    this.history = [];
  }
}
