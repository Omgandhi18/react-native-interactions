import { usePanGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import {
  SensorType,
  useAnimatedSensor,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { MOTION } from './constants';
import { clampUnit } from './foilUniforms';
import { playFlip } from './haptics';

type Point = { x: number; y: number };

/**
 * How the card is tilted and flipped. Tilt (−1 to 1 on each axis) comes from the phone's gravity
 * sensor plus your finger: drag to tilt it further, let go and it springs back. Flick sideways to
 * spin it a half-turn in that direction (it keeps spinning the same way, never back), or tap to flip
 * it forward. The resting angle slowly follows however you hold the phone, so the card starts flat.
 */
export function useCardMotion(screenWidth: number, screenHeight: number) {
  const { sensor } = useAnimatedSensor(SensorType.GRAVITY);
  const restingGravity = useSharedValue<Point | null>(null);
  const sensorX = useSharedValue(0);
  const sensorY = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  /** Half-turns spun so far. Unbounded, so repeated spins keep going the same way. */
  const flip = useSharedValue(0);
  const flipTarget = useSharedValue(0);

  useFrameCallback((frame) => {
    'worklet';
    const { x, y, z } = sensor.get();
    if (x === 0 && y === 0 && z === 0) {
      // No tilt sensor (simulators): sway gently so the foil still catches the light.
      const seconds = frame.timestamp / MOTION.msPerSecond;
      sensorX.set(Math.sin(seconds * MOTION.idleSpeedX) * MOTION.idleSwayX);
      sensorY.set(Math.cos(seconds * MOTION.idleSpeedY) * MOTION.idleSwayY);
      return;
    }

    // Gravity in screen axes, in g (Reanimated reports it toward the ground, with device y up).
    const gravityX = x / MOTION.standardGravity;
    const gravityY = -y / MOTION.standardGravity;
    const resting = restingGravity.get();
    if (resting === null) {
      restingGravity.set({ x: gravityX, y: gravityY });
      return;
    }

    const frameMs = frame.timeSincePreviousFrame ?? MOTION.fallbackFrameMs;
    const blend = Math.min(1, Math.min(MOTION.maxFrameStep, frameMs / MOTION.msPerSecond) * MOTION.recenterPerSecond);
    const next = {
      x: resting.x + (gravityX - resting.x) * blend,
      y: resting.y + (gravityY - resting.y) * blend,
    };
    restingGravity.set(next);
    sensorX.set(clampUnit((gravityX - next.x) * MOTION.sensorSensitivity));
    sensorY.set(clampUnit((gravityY - next.y) * MOTION.sensorSensitivity));
  });

  const tiltX = useDerivedValue(() => clampUnit(sensorX.get() + dragX.get()));
  const tiltY = useDerivedValue(() => clampUnit(sensorY.get() + dragY.get()));
  const rotateY = useDerivedValue(() => flip.get() * Math.PI + tiltX.get() * MOTION.maxRotateY);
  const rotateX = useDerivedValue(() => -tiltY.get() * MOTION.maxRotateX);

  const spin = (halfTurns: number) => {
    'worklet';
    const target = flipTarget.get() + halfTurns;
    flipTarget.set(target);
    flip.set(withSpring(target, MOTION.flip));
    scheduleOnRN(playFlip);
  };

  const dragStartedAt = useSharedValue(0);

  const drag = usePanGesture({
    onBegin: () => {
      'worklet';
      dragStartedAt.set(Date.now());
    },
    onUpdate: (event) => {
      'worklet';
      dragX.set(clampUnit(event.translationX / (screenWidth * MOTION.dragRangeX)));
      dragY.set(clampUnit(event.translationY / (screenHeight * MOTION.dragRangeY)));
    },
    onDeactivate: (event) => {
      'worklet';
      // A fast sideways swipe spins the card the way it moved; a slow drag just tilts it.
      // Speed is the faster of the release speed and the whole swipe's average, because fingers
      // often slow down just before they lift.
      const seconds = Math.max(MOTION.minGestureSeconds, (Date.now() - dragStartedAt.get()) / MOTION.msPerSecond);
      const speed = Math.max(Math.abs(event.velocityX), Math.abs(event.translationX) / seconds);
      const isFlick = speed > MOTION.flickMinVelocity && Math.abs(event.translationX) > MOTION.flickMinDistance;
      if (isFlick) {
        spin(Math.sign(event.translationX));
      }
    },
    onFinalize: () => {
      'worklet';
      dragX.set(withSpring(0, MOTION.springBack));
      dragY.set(withSpring(0, MOTION.springBack));
    },
  });

  const tap = useTapGesture({
    maxDistance: MOTION.tapMaxDistance,
    onActivate: () => {
      'worklet';
      spin(1);
    },
  });

  const gesture = useSimultaneousGestures(drag, tap);

  return { tiltX, tiltY, rotateX, rotateY, gesture };
}
