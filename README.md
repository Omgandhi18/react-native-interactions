# React Native Interactions

Big, full-screen interactions built with React Native, Skia and Reanimated. Each one lives in its
own folder, so you can read it, run it and borrow from it.

## Monsoon Window

<p align="center">
  <img src="media/monsoon-window-fog.jpg" width="280" alt="A fogged-up window at night, with the city lights blurred into soft glows and drops of condensation on the glass" />
  &nbsp;&nbsp;
  <img src="media/monsoon-window-wiped.jpg" width="280" alt="The same window with a patch wiped clear, showing a sharp city of lit tower blocks with rain falling outside" />
</p>

A foggy window on a monsoon night. Wipe the fog with your finger and the street behind it comes
into focus; leave it, and the fog slowly creeps back.

- **Wipe** the glass to clear the fog, with a light haptic tick like a finger on wet glass.
- **Watch** heavy drops run down in stops and starts, swallowing smaller ones and leaving trails.
- **Tilt** the phone to steer the running drops and the rain (needs a real device).
- **Double-tap** for lightning, with thunder you feel through haptics.

### How it works

- **No image files.** The city is generated from a seed: towers, lit windows, street lamps, cars,
  neon signs and reflections on the wet road. It's drawn once to an offscreen image when the
  screen opens.
- **The fog is the same city, heavily blurred,** with every light blooming into a soft glow. Each
  wipe adds circles to a blurred layer that cuts holes in the fog, and every hole fades shut over a
  few seconds.
- **Every drop is a lens.** The renderer clips to the drop's outline and draws the city flipped and
  shrunk around its centre, so each drop shows a tiny upside-down street.
- **Drops merge by volume.** Rain lands, droplets merge, and once one is heavy enough it starts
  running and leaves smaller droplets behind.
- **Everything runs on the UI thread.** A Reanimated frame callback steps the physics, and a Skia
  picture is recorded from that state every frame, so the JS thread stays free.

Code: [`src/interactions/monsoon-window`](src/interactions/monsoon-window). Start with
`simulation.ts` (the physics) and `render.ts` (the drawing). Every tuning value is in
`constants.ts` and `scene/constants.ts`.

## Holo Card

<p align="center">
  <img src="media/holo-card-front.jpg" width="280" alt="A dark metal card tilted in 3D, its wavy security lines and the light across it shimmering in rainbow foil colours" />
  &nbsp;&nbsp;
  <img src="media/holo-card-back.jpg" width="280" alt="The back of the same card: magnetic stripe, a stacked card number stamped into the metal, a signature strip and a glowing hologram sticker" />
</p>

A holographic metal card (an original design, not a real card). Tilt the phone or drag the card and
the foil catches the light; tap to flip it over.

- **Tilt** the phone and the card turns in 3D while a rainbow sheen sweeps across the foil.
- **Drag** to tilt it further by hand; let go and it springs back.
- **Flick** sideways to spin it a half-turn that way (it keeps spinning the same way), or **tap** to
  flip it, to see the back with a hologram sticker and a stamped card number.
- **Feel** a soft haptic tick as the band of light crosses the card.

### How it works

- **The foil is a GPU shader.** A small SkSL program runs for every pixel of the card. It takes the
  artwork, a foil mask (white where the card is holographic) and the tilt, and adds diagonal rainbow
  stripes, a bright band where the light catches, round glitter specks that each flash at their own
  angle, and a moving glare.
- **The artwork is drawn once.** Both faces, and their foil masks, are drawn in code to offscreen
  images when the screen opens; the shader does all the per-frame work.
- **Real 3D.** The card is a Skia group with `perspective`, `rotateX` and `rotateY` transforms. The
  back is drawn mirrored, so when the card turns 180° it reads the right way round.
- **Tilt follows how you hold the phone.** The gravity sensor's resting angle slowly re-centres, so
  the card starts flat in your hand. Without a sensor (simulators), it sways gently on its own.
- **Designs plug in.** A card is just a design (artwork and foil masks for each face), so new cards
  reuse the same engine.

Code: [`src/interactions/holo-card`](src/interactions/holo-card). Start with `foilShader.ts` (the
foil) and `CardScene.tsx` (the 3D scene). The Prism card's design is in `designs/credit-card`.

## Marble Dust

<p align="center">
  <img src="media/marble-dust-statue.jpg" width="280" alt="The head of Michelangelo's David drawn in thousands of small marble-white dots on black, lit from the upper left" />
  &nbsp;&nbsp;
  <img src="media/marble-dust-scattered.jpg" width="280" alt="The same head with a swipe torn through the eyes and brow, the dots streaming off to the right" />
</p>

Michelangelo's David, made of 12,000 grains of marble dust. Swipe through him and the grains
scatter, then drift back into place; tap and he bursts apart.

- **Swipe** through the statue to knock grains loose. They're dragged along with your finger and
  pushed out from it, so a finger held still parts the dust.
- **Tap** to shatter him. Every grain blasts away from your finger, toward and away from you, then
  finds its way home.
- **Watch** him sway slowly from side to side, so you can see he's 3D, not a flat picture.
- **Feel** a gritty tick while a swipe tears through, and a thump when he shatters.

### How it works

- **A real 3D scan.** The shape comes from a scan of a plaster cast of David's head, released into
  the public domain by SMK, the National Gallery of Denmark. `scripts/scan-to-points.mjs` turns its
  400,000 triangles into 12,000 points, each with a surface normal, packed into a 157 KB file.
- **Evenly spaced, not random.** Random points clump and leave holes, which reads as noise. The
  script draws many candidates and keeps one only if no kept point is too close, and packs more
  points onto the surfaces that face you.
- **Shadows are baked in.** For each point, the script measures how much nearby surface rises above
  it, so points in the eye sockets and between the curls come out darker. That's most of what makes
  the face read.
- **Physics on the UI thread.** Each grain has a home on the statue and a spring pulling it back. A
  Reanimated frame callback steps all 12,000 every frame, in typed arrays, so the JS thread stays free.
- **One draw call.** Every grain is drawn with a single Skia `drawAtlas`. Passing a colour per grain
  to native code is slow, so instead the atlas is a strip of 16 pre-shaded dots and each grain
  points at the brightness it needs.

Code: [`src/interactions/marble-dust`](src/interactions/marble-dust). Start with `simulation.ts`
(the physics) and `render.ts` (the drawing). Every tuning value is in `constants.ts`.

To rebuild the points, download
[SMK's scan](https://api.smk.dk/api/v1/download-3d/nz806401j_KAS2232_small.stl) (20 MB) and run:

```bash
node scripts/scan-to-points.mjs nz806401j_KAS2232_small.stl src/interactions/marble-dust/scan.generated.ts --front 210 --count 12000 --crop-bottom 0.13
```

## Coming next

The pieces planned next are listed in [IDEAS.md](IDEAS.md).

## Run it

You need Node (current LTS) and pnpm. Then:

```bash
pnpm install
pnpm start
```

- **Phone:** install Expo Go, then scan the QR code (iPhone: Camera app; Android: Expo Go). The
  phone must be on the same Wi-Fi as your computer.
- **Android emulator:** press `a` in the terminal.
- **iOS simulator (Mac only):** press `i`.

Simulators and emulators can't feel tilt or haptics; use a real phone for those.

## Add an interaction

```bash
pnpm new card-stack "Card Stack"
```

This creates `src/interactions/card-stack/` from the template and adds it to the gallery. Build
the interaction in `CardStack.tsx`, then fill in the description in `index.ts`. Set
`fullScreen: true` there to hide the header and status bar.

## Record a demo

**Android (Windows):** with a phone or emulator connected, run

```bash
pnpm record:android monsoon-window -Seconds 20 -ShowTouches -Gif
```

This saves `media/monsoon-window.mp4` and, with `-Gif` and ffmpeg installed,
`media/monsoon-window.gif`. Without `-Seconds`, recording stops when you close the scrcpy window.

**iOS (Mac):** record the simulator with
`xcrun simctl io booted recordVideo --codec=h264 media/monsoon-window.mp4` (Ctrl+C to stop), or
record an iPhone with its built-in Screen Recording.

## Project layout

```
src/
  app/                       Expo Router screens: the gallery and one screen per interaction
  components/                Shared UI (gallery card, floating back button, fading hint)
  interactions/
    monsoon-window/          Component, simulation, renderer, tilt input, haptics
      scene/                 The generated city, the fog and the drop sprites
    holo-card/               Foil shader, 3D scene, tilt/drag/flip motion, haptics
      designs/               Card designs: artwork and foil masks for each face
    marble-dust/             Grain physics, atlas renderer, gestures, and the generated scan points
    registry.ts              The list the gallery reads
  shared/                    Helpers used by several interactions (offscreen rendering, sizing)
  theme.ts                   Colours, spacing, radii, type sizes
scripts/
  new-interaction.mjs        Scaffolds a new interaction
  scan-to-points.mjs         Turns a 3D scan (binary STL) into Marble Dust's points
  record-android.ps1         Records a demo with scrcpy
media/                       Screenshots and demo recordings
```

## Built with

Expo SDK 58, React Native 0.88, React Native Skia 2, Reanimated 4, Gesture Handler 3.

## License

MIT
