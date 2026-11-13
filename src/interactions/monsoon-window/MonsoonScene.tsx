import { Canvas, createPicture, Picture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { TIMING } from './constants';
import { playThunder, playWipeTick } from './haptics';
import { createRenderKit, drawFrame } from './render';
import { createSceneAssets } from './scene';
import { createInitialState, endWipe, stepSimulation, triggerLightning, wipeTo } from './simulation';
import { useScreenGravity } from './useScreenGravity';

const LIGHTNING_TAPS = 2;

type Props = {
  width: number;
  height: number;
};

/** Wires the simulation, the renderer, gestures and the tilt sensor together for a given size. */
export function MonsoonScene({ width, height }: Props) {
  const kit = useMemo(
    () => createRenderKit(createSceneAssets(width, height, PixelRatio.get()), width, height),
    [width, height],
  );
  const initialState = useMemo(() => createInitialState(width, height), [width, height]);

  // The simulation mutates this object in place on the UI thread; `clock` tells the picture to redraw.
  const state = useSharedValue(initialState);
  const clock = useSharedValue(0);
  const gravity = useScreenGravity();

  useFrameCallback((frame) => {
    'worklet';
    const frameMs = frame.timeSincePreviousFrame ?? TIMING.fallbackFrameMs;
    const dt = Math.min(TIMING.maxFrameStep, frameMs / TIMING.msPerSecond);
    if (stepSimulation(state.get(), dt, gravity.get())) {
      scheduleOnRN(playThunder);
    }
    clock.set(frame.timestamp);
  });

  const picture = useDerivedValue(() => {
    clock.get();
    return createPicture((canvas) => drawFrame(canvas, state.get(), kit), kit.screenRect);
  });

  const wipe = usePanGesture({
    minDistance: 0,
    onBegin: (event) => {
      'worklet';
      if (wipeTo(state.get(), event.x, event.y)) {
        scheduleOnRN(playWipeTick);
      }
    },
    onUpdate: (event) => {
      'worklet';
      if (wipeTo(state.get(), event.x, event.y)) {
        scheduleOnRN(playWipeTick);
      }
    },
    onFinalize: () => {
      'worklet';
      endWipe(state.get());
    },
  });

  const summonLightning = useTapGesture({
    numberOfTaps: LIGHTNING_TAPS,
    onActivate: () => {
      'worklet';
      triggerLightning(state.get());
      scheduleOnRN(playThunder);
    },
  });

  const gesture = useSimultaneousGestures(wipe, summonLightning);

  return (
    <GestureDetector gesture={gesture}>
      <View style={StyleSheet.absoluteFill}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Picture picture={picture} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}
