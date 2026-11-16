import { Canvas, createPicture, Picture, RadialGradient, Rect, Skia, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BACKGROUND, BLAST, HAPTICS, TIMING } from './constants';
import { playBlast, playScatterTick } from './haptics';
import type { AtlasBuffers } from './render';
import { createAtlasBuffers, createGrainAtlas, drawDust } from './render';
import { loadScan } from './scan';
import { createDustState, liftFinger, moveFinger, queueBlast, stepDust } from './simulation';

type Props = {
  width: number;
  height: number;
};

/** Wires the grain physics, the renderer and the gestures together for a given size. */
export function DustScene({ width, height }: Props) {
  const initialState = useMemo(() => createDustState(loadScan(), width, height), [width, height]);
  const atlas = useMemo(createGrainAtlas, []);
  const paint = useMemo(() => Skia.Paint(), []);
  const screenRect = useMemo(() => Skia.XYWHRect(0, 0, width, height), [width, height]);

  // The physics mutates this object in place on the UI thread; `clock` tells the picture to redraw.
  const state = useSharedValue(initialState);
  const buffers = useSharedValue<AtlasBuffers | null>(null);
  const clock = useSharedValue(0);

  useFrameCallback((frame) => {
    'worklet';
    const frameMs = frame.timeSincePreviousFrame ?? TIMING.fallbackFrameMs;
    const dt = Math.min(TIMING.maxFrameStep, frameMs / TIMING.msPerSecond);
    const dust = state.get();
    if (buffers.get() === null) {
      buffers.set(createAtlasBuffers(dust.count, atlas));
    }
    const knocked = stepDust(dust, dt);
    if (knocked >= HAPTICS.scatterMinGrains && frame.timestamp - dust.lastScatterTickAt > HAPTICS.scatterTickGapMs) {
      dust.lastScatterTickAt = frame.timestamp;
      scheduleOnRN(playScatterTick);
    }
    clock.set(frame.timestamp);
  });

  const picture = useDerivedValue(() => {
    clock.get();
    const dust = state.get();
    const atlasBuffers = buffers.get();
    return createPicture((canvas) => {
      // The buffers are made on the UI thread's first frame, so the very first picture is empty.
      if (atlasBuffers) {
        drawDust(canvas, dust, atlas, atlasBuffers, paint);
      }
    }, screenRect);
  });

  const swipe = usePanGesture({
    minDistance: 0,
    onBegin: (event) => {
      'worklet';
      moveFinger(state.get(), event.x, event.y, 0, 0);
    },
    onUpdate: (event) => {
      'worklet';
      moveFinger(state.get(), event.x, event.y, event.velocityX, event.velocityY);
    },
    onFinalize: () => {
      'worklet';
      liftFinger(state.get());
    },
  });

  const shatter = useTapGesture({
    maxDistance: BLAST.tapMaxDistance,
    onActivate: (event) => {
      'worklet';
      queueBlast(state.get(), event.x, event.y);
      scheduleOnRN(playBlast);
    },
  });

  const gesture = useSimultaneousGestures(swipe, shatter);

  return (
    <GestureDetector gesture={gesture}>
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
