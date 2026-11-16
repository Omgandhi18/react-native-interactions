import { Canvas, createPicture, Picture, RadialGradient, Rect, Skia, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import { Easing, useDerivedValue, useFrameCallback, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useScreenGravity } from '@/shared/useScreenGravity';

import { BACKGROUND, FLIP, TIMING } from './constants';
import { createGlassLayout } from './glass';
import { playLand, playLift, playRunOut } from './haptics';
import type { AtlasBuffers } from './render';
import { createAtlasBuffers, createRenderKit, drawHourglass } from './render';
import { createSandState, setGravity, stepSand, takeRunOut } from './simulation';

const HALF_TURN = Math.PI;

type Props = {
  width: number;
  height: number;
};

/** Wires the sand, the renderer, the flip gesture and the tilt sensor together for a given size. */
export function HourglassScene({ width, height }: Props) {
  const layout = useMemo(() => createGlassLayout(width, height), [width, height]);
  const kit = useMemo(() => createRenderKit(layout), [layout]);
  const initialState = useMemo(() => createSandState(layout), [layout]);
  const screenRect = useMemo(() => Skia.XYWHRect(0, 0, width, height), [width, height]);

  // The physics mutates this object in place on the UI thread; `clock` tells the picture to redraw.
  const state = useSharedValue(initialState);
  const buffers = useSharedValue<AtlasBuffers | null>(null);
  const clock = useSharedValue(0);
  // How far the glass has been turned on screen, and where the latest flip will leave it.
  const angle = useSharedValue(0);
  const restingAngle = useSharedValue(0);
  const gravity = useScreenGravity();

  useFrameCallback((frame) => {
    'worklet';
    const frameMs = frame.timeSincePreviousFrame ?? TIMING.fallbackFrameMs;
    const dt = Math.min(TIMING.maxFrameStep, frameMs / TIMING.msPerSecond);
    const sand = state.get();
    if (buffers.get() === null) {
      buffers.set(createAtlasBuffers(sand.count, kit.atlas));
    }
    // Turn the screen's gravity into the glass's own axes: the sand only knows the glass.
    const { x, y } = gravity.get();
    const turn = angle.get();
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    setGravity(sand, cos * x + sin * y, cos * y - sin * x);
    stepSand(sand, dt);
    if (takeRunOut(sand)) {
      scheduleOnRN(playRunOut);
    }
    clock.set(frame.timestamp);
  });

  const picture = useDerivedValue(() => {
    clock.get();
    const sand = state.get();
    const atlasBuffers = buffers.get();
    const turn = angle.get();
    return createPicture((canvas) => {
      // The buffers are made on the UI thread's first frame, so the very first picture is empty.
      if (atlasBuffers) {
        drawHourglass(canvas, sand, kit, atlasBuffers, turn);
      }
    }, screenRect);
  });

  const flip = useTapGesture({
    onActivate: () => {
      'worklet';
      const target = restingAngle.get() + HALF_TURN;
      restingAngle.set(target);
      angle.set(
        withTiming(target, { duration: FLIP.durationMs, easing: Easing.inOut(Easing.cubic) }, (finished) => {
          'worklet';
          if (finished) {
            scheduleOnRN(playLand);
          }
        }),
      );
      scheduleOnRN(playLift);
    },
  });

  return (
    <GestureDetector gesture={flip}>
      <View style={StyleSheet.absoluteFill}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Rect x={0} y={0} width={width} height={height}>
            <RadialGradient
              c={vec(width / 2, height * BACKGROUND.centerY)}
              r={height * BACKGROUND.radius}
              colors={[...BACKGROUND.colors]}
              positions={[...BACKGROUND.positions]}
            />
          </Rect>
          <Picture picture={picture} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}
