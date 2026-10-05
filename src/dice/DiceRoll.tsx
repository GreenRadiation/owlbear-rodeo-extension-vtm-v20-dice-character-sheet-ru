import { Physics, useRapier } from "@react-three/rapier";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { TrayColliders } from "../colliders/TrayColliders";
import { DiceRoll as DiceRollType } from "../types/DiceRoll";
import { DiceThrow } from "../types/DiceThrow";
import { DiceTransform } from "../types/DiceTransform";
import { Die } from "../types/Die";
import { Dice as DefaultDice } from "./Dice";
import { PhysicsDice } from "./PhysicsDice";
import { useDebugStore } from "../debug/store";
import { DiceScaleContext } from "./scale";
import { PHYSICS_TIME_STEP } from "./timing";
import { DiceLookContext } from "./lookContext";

/** Without an animation frame for this long the window is taken to be not visible, in milliseconds */
const FRAME_TIMEOUT = 250;
/** How often to check for missing animation frames, in milliseconds */
const FRAME_CHECK_INTERVAL = 100;
/** The most the physics catch up in one go, in seconds: longer than any roll */
const MAX_CATCH_UP = 10;

/**
 * Keeps the physics going in a window that isn't visible.
 * Browsers stop firing animation frames when a window is hidden, minimized
 * or covered and the physics are stepped by them. Without this a roll made
 * right before switching to another window never lands and everyone waits
 * for its result.
 * The steps are the same fixed steps so the roll comes out the same.
 */
function HiddenWindowStepper({ paused }: { paused: boolean }) {
  const { step } = useRapier();

  useEffect(() => {
    if (paused) {
      return;
    }
    let lastFrame = performance.now();
    let frame = requestAnimationFrame(function loop() {
      lastFrame = performance.now();
      frame = requestAnimationFrame(loop);
    });
    /** When the physics were last stepped from here, 0 while frames are coming */
    let lastStep = 0;
    // Timers of a hidden window are slowed down too, hence the catching up
    const interval = setInterval(() => {
      const now = performance.now();
      if (now - lastFrame < FRAME_TIMEOUT) {
        lastStep = 0;
        return;
      }
      let remaining = Math.min(
        (now - (lastStep || lastFrame)) / 1000,
        MAX_CATCH_UP
      );
      lastStep = now;
      while (remaining > 0) {
        // A step call takes half a second at most
        const delta = Math.min(remaining, 0.25);
        step(delta);
        remaining -= delta;
      }
    }, FRAME_CHECK_INTERVAL);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(interval);
    };
  }, [paused, step]);

  return null;
}

function ScaledDiceRoll({
  roll,
  rollThrows,
  onRollFinished,
  finishedTransforms,
  transformsRef,
  Dice,
}: {
  roll: DiceRollType;
  rollThrows: Record<string, DiceThrow>;
  onRollFinished?: (
    id: string,
    number: number,
    transform: DiceTransform
  ) => void;
  finishedTransforms?: Record<string, DiceTransform>;
  /** An updated ref of the current dice transforms */
  transformsRef?: React.MutableRefObject<Record<
    string,
    DiceTransform | null
  > | null>;
  /** Override to provide a custom Dice component  */
  Dice: React.FC<JSX.IntrinsicElements["group"] & { die: Die }>;
}) {
  const allowPhysicsDebug = useDebugStore((state) => state.allowPhysicsDebug);

  const dice = useMemo(() => roll && getDieFromDice(roll), [roll]);

  const emptyCallback = useCallback(() => {}, []);

  /**
   * Because we recreate the physics world every new roll
   * there is a frame where all the rigid bodies need to be created
   * to ensure smooth playback we pause the physics sim until
   * the frame after everything is created
   */
  const [paused, setPaused] = useState(true);
  const finished = Boolean(finishedTransforms);
  useEffect(() => {
    if (finished) {
      setPaused(true);
      return;
    }
    // A window that isn't visible gets no animation frames, don't wait for one forever
    let started = false;
    const start = () => {
      if (!started) {
        started = true;
        setPaused(false);
      }
    };
    const frame = requestAnimationFrame(start);
    const timeout = setTimeout(start, 100);
    return () => {
      started = true;
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [finished]);

  if (finishedTransforms) {
    // Move to a static dice representation when all dice values have been found
    return (
      <group>
        {dice?.map((die) => {
          const dieTransform = finishedTransforms[die.id]!;
          const p = dieTransform.position;
          const r = dieTransform.rotation;
          return (
            <Dice
              userData={{ dieId: die.id }}
              key={die.id}
              die={die}
              position={[p.x, p.y, p.z]}
              quaternion={[r.x, r.y, r.z, r.w]}
            />
          );
        })}
      </group>
    );
  } else {
    // If we have physics states for the dice then create a Rapier physics
    // instance for this roll.
    // We need to re-create the physics world on every new roll as the dice
    // networking relies on the deterministic nature of Rapier when given the
    // same inputs and using the same number of update timesteps.
    return (
      <Physics
        colliders={false}
        interpolate={false}
        timeStep={PHYSICS_TIME_STEP}
        debug={allowPhysicsDebug}
        updateLoop="independent"
        paused={paused}
      >
        <HiddenWindowStepper paused={paused} />
        <TrayColliders widthScale={roll.tray || 1} />
        {dice?.map((die) => {
          const dieThrow = rollThrows[die.id];
          // Use a fixed transform if we have it
          // This allows re-rolling of individual dice as
          // we can lock the dice that are already in the tray
          const fixedTransform = transformsRef?.current?.[die.id] || undefined;
          return (
            <PhysicsDice
              key={die.id}
              die={die}
              dieThrow={dieThrow}
              onRollFinished={onRollFinished}
              fixedTransform={fixedTransform}
            >
              {/* Override onClick event to make sure simulated dice can't be selected */}
              <Dice
                die={die}
                onClick={emptyCallback}
                onPointerDown={emptyCallback}
              />
            </PhysicsDice>
          );
        })}
      </Physics>
    );
  }
}

ScaledDiceRoll.defaultProps = {
  Dice: DefaultDice,
};

type ScaledDiceRollProps = Parameters<typeof ScaledDiceRoll>[0];

/** A roll of dice, everything inside uses the size and the look of the dice the roll was made with */
export function DiceRoll(
  props: Omit<ScaledDiceRollProps, "Dice"> &
    Partial<Pick<ScaledDiceRollProps, "Dice">>
) {
  return (
    <DiceScaleContext.Provider value={props.roll.scale || 1}>
      <DiceLookContext.Provider value={props.roll.look}>
        <ScaledDiceRoll {...props} />
      </DiceLookContext.Provider>
    </DiceScaleContext.Provider>
  );
}
