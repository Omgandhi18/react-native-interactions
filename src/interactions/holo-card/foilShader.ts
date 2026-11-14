import { Skia } from '@shopify/react-native-skia';

/**
 * The holographic foil, as an SkSL shader that runs on the GPU for every pixel of the card.
 *
 * Inputs: the card's artwork, a foil mask (white = full foil, black = none), the card's size and
 * position, and how far the card is tilted. Where the mask is white, the shader adds:
 * - rainbow stripes that slide across the card as it tilts,
 * - a bright band where the light "catches" the foil,
 * - glitter: tiny cells that each flash at their own angle,
 * - a soft glare that moves opposite to the tilt.
 * The rainbow is screen-blended onto the artwork, so the print underneath stays readable.
 */
const FOIL_SKSL = `
uniform shader art;
uniform shader foil;
uniform float2 size;
uniform float2 offset;
uniform float2 tilt;
uniform float2 bandShift;
uniform float sheen;
uniform float bandWidth;
uniform float hueSpread;
uniform float glitter;
uniform float glare;

const float TAU = 6.2831853;
// Glitter grid size, in dp.
const float GLITTER_CELL = 3.0;

// A smooth trip around the colour wheel as t goes from 0 to 1.
float3 spectrum(float t) {
  return 0.5 + 0.5 * cos(TAU * (t + float3(0.0, 0.33, 0.67)));
}

// The classic sine hash: a repeatable pseudo-random number per cell.
float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

half4 main(float2 coord) {
  half4 base = art.eval(coord);
  float amount = float(foil.eval(coord).r);
  float2 uv = (coord - offset) / size;

  // Diagonal rainbow stripes that slide with the tilt.
  float stripes = dot(uv, float2(0.6, 0.8)) * hueSpread + tilt.x * 0.8 + tilt.y * 0.5;
  float3 rainbow = spectrum(stripes);

  // The bright band, swept across the card by the tilt.
  float bandCenter = 0.5 + dot(tilt, bandShift);
  float fromBand = (dot(uv, float2(0.55, 0.45)) - bandCenter) / bandWidth;
  float band = exp(-fromBand * fromBand);

  // Glitter: about one cell in five holds a soft round speck that flashes at its own angle.
  float2 cell = coord / GLITTER_CELL;
  float seed = hash(floor(cell));
  float speck = 1.0 - smoothstep(0.12, 0.42, length(fract(cell) - 0.5));
  float flash = cos(seed * TAU * 4.0 + tilt.x * 9.0 - tilt.y * 7.0);
  float sparkle = step(0.82, seed) * smoothstep(0.96, 1.0, flash) * speck * glitter;

  float strength = amount * (sheen + (1.0 - sheen) * band);
  float3 holo = clamp(rainbow * strength + sparkle * amount, 0.0, 1.0);
  float3 color = 1.0 - (1.0 - float3(base.rgb)) * (1.0 - holo);

  // Glare from a light that moves opposite to the tilt.
  float2 toLight = (uv - float2(0.5 - tilt.x * 0.6, 0.35 - tilt.y * 0.6)) * float2(1.6, 1.0);
  color += glare * exp(-dot(toLight, toLight) * 6.0);

  return half4(half3(color) * base.a, base.a);
}
`;

const effect = Skia.RuntimeEffect.Make(FOIL_SKSL);
if (!effect) {
  throw new Error('Holo card: the foil shader failed to compile');
}

export const foilEffect = effect;
