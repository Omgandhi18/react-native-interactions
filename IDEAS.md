# Ideas

Big, full-screen interactions to build. Each one is a single post that stands on its own:
no numbering, no series, no follow-ups. The full list of upcoming pieces and the posting
schedule live in a separate posting plan.

| # | Interaction | Status | Difficulty |
|---|---|---|---|
| 1 | Monsoon window | Posted | Medium–hard |
| 2 | Holographic tilt card | Posted | Medium |
| 3 | Particles that explode and reassemble (Marble Dust) | Posted | Medium–hard |
| 4 | Page curl | Idea | Hard |
| 5 | Ride replay | Idea | Medium–hard |
| 6 | Ink in water | Idea | Hard |

## 1. Monsoon window
The screen is a rain-streaked, foggy window. Drag a finger to wipe the fog away and see a
blurred city behind it. Drops run down the glass, and tilting the phone changes which way
they slide.
**Techniques:** Skia shaders (blur, refraction through drops), a wipe mask that slowly
fogs back over, drop simulation, motion sensor.

## 2. Holographic tilt card
A full-screen card (a ticket or ID) with a holographic foil shine that follows how you
tilt the phone.
**Techniques:** Skia shader for the foil, motion sensor, 3D perspective transform.

## 3. Particles that explode and reassemble
Michelangelo's David made of thousands of grains of marble dust. Swipe through him and they
scatter, then drift back into place; tap and he bursts apart.
**Techniques:** sampling a public-domain 3D scan into evenly spaced points with baked shadows,
Skia Atlas for drawing thousands of sprites, per-particle physics on the UI thread.

## 4. Page curl
A full-screen book or magazine page that curls realistically under your finger, shading
included.
**Techniques:** page-curl maths in a Skia shader, gesture-driven fold line, lighting.

## 5. Ride replay
A stylised mountain route draws itself across the screen, a bike follows the road, and
scrubbing an elevation graph at the bottom moves you through the ride, with layered
mountains moving at different speeds for depth.
**Techniques:** Skia path drawing and measuring, position along a path, layered parallax,
scrubbing gesture.

## 6. Ink in water
Touch the screen to swirl ink through water.
**Techniques:** a fluid or noise-based shader, touch-driven forces, colour mixing.
