import { Canvas, createPicture, Picture, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { TIMING } from './constants';
import type { AtlasBuffers } from './render';
import { createAtlasBuffers, createRenderKit, drawFlock } from './render';
import { createFlockState, liftFalcon, moveFalcon, stepFlock } from './simulation';

type Props = {
  width: number;
  height: number;
};

/** Wires the flock, the renderer and the falcon under your finger together for a given size. */
export function MurmurationScene({ width, height }: Props) {
  const kit = useMemo(() => createRenderKit(width, height), [width, height]);
  const initialState = useMemo(() => createFlockState(width, height), [width, height]);
  const screenRect = useMemo(() => Skia.XYWHRect(0, 0, width, height), [width, height]);

  // The flock is mutated in place on the UI thread; `clock` tells the picture to redraw.
  const state = useSharedValue(initialState);
  const buffers = useSharedValue<AtlasBuffers | null>(null);
  const clock = useSharedValue(0);

  useFrameCallback((frame) => {
    'worklet';
    const frameMs = frame.timeSincePreviousFrame ?? TIMING.fallbackFrameMs;
    const dt = Math.min(TIMING.maxFrameStep, frameMs / TIMING.msPerSecond);
    const flock = state.get();
    if (buffers.get() === null) {
      buffers.set(createAtlasBuffers(flock.count, kit.atlas));
    }
    stepFlock(flock, dt);
    clock.set(frame.timestamp);
  });

  const birds = useDerivedValue(() => {
    clock.get();
    const flock = state.get();
    const atlasBuffers = buffers.get();
    return createPicture((canvas) => {
      // The buffers are made on the UI thread's first frame, so the very first picture is empty.
      if (atlasBuffers) {
        drawFlock(canvas, flock, kit, atlasBuffers);
      }
    }, screenRect);
  });

  const falcon = usePanGesture({
    minDistance: 0,
    onBegin: (event) => {
      'worklet';
      moveFalcon(state.get(), event.x, event.y);
    },
    onUpdate: (event) => {
      'worklet';
      moveFalcon(state.get(), event.x, event.y);
    },
    onFinalize: () => {
      'worklet';
      liftFalcon(state.get());
    },
  });

  return (
    <GestureDetector gesture={falcon}>
      <View style={StyleSheet.absoluteFill}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Picture picture={kit.sky.back} />
          <Picture picture={birds} />
          <Picture picture={kit.sky.front} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}
