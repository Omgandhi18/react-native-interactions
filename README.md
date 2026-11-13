# React Native Interactions

A growing collection of small, polished React Native interactions, built with
Reanimated, Gesture Handler and Skia. Each one lives in its own folder, so you can
copy it straight into your app.

## Gallery

_Coming soon._

## Run it

You need Node and pnpm. Then:

```bash
pnpm install
pnpm start
```

- **Phone:** install Expo Go, then scan the QR code (iPhone: Camera app; Android: Expo Go).
  The phone must be on the same Wi-Fi as your computer.
- **Android emulator:** press `a` in the terminal.
- **iOS simulator (Mac only):** press `i`.

## Add an interaction

```bash
pnpm new card-stack "Card Stack"
```

This creates `src/interactions/card-stack/` from the template and adds it to the
gallery. Build the interaction in `CardStack.tsx`, then add a one-line description in
`index.ts`.

## Record a demo

**Android (Windows):** with a phone or emulator connected, run

```bash
pnpm record:android card-stack -Seconds 15 -ShowTouches -Gif
```

This saves `media/card-stack.mp4` (for posting) and, with `-Gif` and ffmpeg installed,
`media/card-stack.gif` (for this README). Without `-Seconds`, recording stops when you
close the scrcpy window.

**iOS (Mac):** record the simulator with
`xcrun simctl io booted recordVideo media/card-stack.mov`, or record an iPhone with
QuickTime Player → New Movie Recording → pick the iPhone as the camera.

## Project layout

```
src/
  app/                 Expo Router screens: gallery list and one screen per interaction
  components/          Shared UI (gallery card)
  interactions/
    <slug>/            One folder per interaction: component + metadata
    registry.ts        The list the gallery reads
  theme.ts             Colors, spacing, radii, type sizes
scripts/
  new-interaction.mjs  Scaffolds a new interaction
  record-android.ps1   Records a demo with scrcpy
media/                 Demo videos and GIFs
```

## License

MIT
