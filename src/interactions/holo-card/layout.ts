import { CARD } from './constants';

export type CardLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  centerX: number;
  centerY: number;
};

/** Where the card sits: as big as fits the screen, centred horizontally, a little above the middle. */
export function cardLayout(screenWidth: number, screenHeight: number): CardLayout {
  const width = Math.min(
    screenWidth * CARD.maxWidthFraction,
    (screenHeight * CARD.maxHeightFraction) / CARD.aspectRatio,
  );
  const height = width * CARD.aspectRatio;
  const centerX = screenWidth / 2;
  const centerY = screenHeight * CARD.centerY;
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
    radius: width * CARD.cornerRadiusFraction,
    centerX,
    centerY,
  };
}
