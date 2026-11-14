import { Group, ImageShader, RoundedRect, Shader } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

import type { FaceImages } from './cardImages';
import { CARD } from './constants';
import { foilEffect } from './foilShader';
import type { foilUniforms } from './foilUniforms';
import type { CardLayout } from './layout';

type Props = {
  layout: CardLayout;
  images: FaceImages;
  uniforms: SharedValue<ReturnType<typeof foilUniforms>>;
  opacity: SharedValue<number>;
};

/** One face of the card: its artwork run through the foil shader, with a faint edge highlight. */
export function CardFaceView({ layout, images, uniforms, opacity }: Props) {
  const rect = { x: layout.x, y: layout.y, width: layout.width, height: layout.height };

  return (
    <Group opacity={opacity}>
      <RoundedRect {...rect} r={layout.radius}>
        <Shader source={foilEffect} uniforms={uniforms}>
          <ImageShader image={images.art} fit="fill" rect={rect} />
          <ImageShader image={images.foil} fit="fill" rect={rect} />
        </Shader>
      </RoundedRect>
      <RoundedRect
        {...rect}
        r={layout.radius}
        style="stroke"
        strokeWidth={CARD.edgeWidth}
        color={CARD.edgeColor}
      />
    </Group>
  );
}
