import { Canvas, createPicture, Picture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { TIMING } from './constants';
import { playPulse, playStartle, playWake } from './haptics';
import { createJarLayout } from './jar';
import type { FrameBuffers } from './render';
import { createFrameBuffers, createRenderKit, drawScene } from './render';
import { createSwarmState, startleSwarm, stepSwarm, wakeSwarm } from './simulation';
import { createMeteor, stepMeteor } from './sky';

type Props = {
  width: number;
  height: number;
};

/** Wires the swarm, the sky, the renderer and the taps together for a given size. */
export function FirefliesScene({ width, height }: Props) {
  const jar = useMemo(() => createJarLayout(width, height), [width, height]);
  const kit = useMemo(() => createRenderKit(width, height, jar, PixelRatio.get()), [width, height, jar]);
  const initialState = useMemo(() => createSwarmState(width, height, jar), [width, height, jar]);
  const initialMeteor = useMemo(() => createMeteor(), []);

  // The swarm and the shooting star are mutated in place on the UI thread; `clock` tells the picture to redraw.
  const state = useSharedValue(initialState);
  const meteor = useSharedValue(initialMeteor);
  const buffers = useSharedValue<FrameBuffers | null>(null);
  const clock = useSharedValue(0);

  useFrameCallback((frame) => {
    'worklet';
    const frameMs = frame.timeSincePreviousFrame ?? TIMING.fallbackFrameMs;
    const dt = Math.min(TIMING.maxFrameStep, frameMs / TIMING.msPerSecond);
    const swarm = state.get();
    if (buffers.get() === null) {
      buffers.set(createFrameBuffers(kit, swarm.count));
    }
    if (stepSwarm(swarm, dt)) {
      scheduleOnRN(playPulse);
    }
    stepMeteor(meteor.get(), swarm.time, width, height);
    clock.set(frame.timestamp);
  });

  const scene = useDerivedValue(() => {
    clock.get();
    const swarm = state.get();
    const shootingStar = meteor.get();
    const frameBuffers = buffers.get();
    return createPicture((canvas) => drawScene(canvas, swarm, shootingStar, kit, frameBuffers), kit.bounds);
  });

  // The first tap wakes them; after that, a tap startles them.
  const tap = useTapGesture({
    onActivate: (event) => {
      'worklet';
      const swarm = state.get();
      if (wakeSwarm(swarm)) {
        scheduleOnRN(playWake);
      } else {
        startleSwarm(swarm, event.x, event.y);
        scheduleOnRN(playStartle);
      }
    },
  });

  return (
    <GestureDetector gesture={tap}>
      <View style={StyleSheet.absoluteFill}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Picture picture={scene} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}
