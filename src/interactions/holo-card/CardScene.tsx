import { BlurMask, Canvas, Group, RadialGradient, Rect, RoundedRect, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue } from 'react-native-reanimated';

import { CardFaceView } from './CardFaceView';
import { renderCardImages } from './cardImages';
import { BACKGROUND, MOTION, SHADOW } from './constants';
import type { CardDesign } from './designs/types';
import { foilUniforms } from './foilUniforms';
import { cardLayout } from './layout';
import { useCardMotion } from './useCardMotion';
import { useGlintHaptics } from './useGlintHaptics';

type Props = {
  width: number;
  height: number;
  design: CardDesign;
};

/** The card in 3D over a dark backdrop, with a soft shadow that slides as it tilts. */
export function CardScene({ width, height, design }: Props) {
  const layout = useMemo(() => cardLayout(width, height), [width, height]);
  const images = useMemo(
    () => renderCardImages(design, layout.width, layout.height, PixelRatio.get()),
    [design, layout],
  );
  const { tiltX, tiltY, rotateX, rotateY, gesture } = useCardMotion(width, height);
  useGlintHaptics(tiltX, tiltY);

  const cardTransform = useDerivedValue(() => [
    { perspective: MOTION.perspective },
    { rotateX: rotateX.get() },
    { rotateY: rotateY.get() },
  ]);
  // Show whichever face points at the viewer.
  const frontOpacity = useDerivedValue<number>(() => (Math.cos(rotateY.get()) >= 0 ? 1 : 0));
  const backOpacity = useDerivedValue<number>(() => 1 - frontOpacity.get());
  const frontUniforms = useDerivedValue(() =>
    foilUniforms(layout, design.front.foil, tiltX.get(), tiltY.get()),
  );
  // The back is mirrored, so its horizontal tilt runs the other way.
  const backUniforms = useDerivedValue(() =>
    foilUniforms(layout, design.back.foil, -tiltX.get(), tiltY.get()),
  );
  const shadowTransform = useDerivedValue(() => [
    { translateX: -tiltX.get() * SHADOW.shift },
    { translateY: SHADOW.offsetY - tiltY.get() * SHADOW.shift },
  ]);

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
          <Group transform={shadowTransform}>
            <RoundedRect
              x={layout.x + SHADOW.inset}
              y={layout.y + SHADOW.inset}
              width={layout.width - SHADOW.inset * 2}
              height={layout.height - SHADOW.inset * 2}
              r={layout.radius}
              color={SHADOW.color}
            >
              <BlurMask blur={SHADOW.blur} style="normal" />
            </RoundedRect>
          </Group>
          <Group transform={cardTransform} origin={vec(layout.centerX, layout.centerY)}>
            <CardFaceView layout={layout} images={images.front} uniforms={frontUniforms} opacity={frontOpacity} />
            <CardFaceView layout={layout} images={images.back} uniforms={backUniforms} opacity={backOpacity} />
          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
}
