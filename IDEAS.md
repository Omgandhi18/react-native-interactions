# Ideas

Big, full-screen interactions to build, roughly in order. Each one becomes 3–4 posts:
the idea and a rough first version, a breakdown of the hardest technique, then the
polished final video.

| # | Interaction | Status | Difficulty |
|---|---|---|---|
| 1 | Monsoon window | Built, ready to record | Medium–hard |
| 2 | Holographic tilt card | Built, ready to record | Medium |
| 3 | Particles that explode and reassemble | Idea | Medium–hard |
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
Your name made of thousands of particles. Swipe through it and they scatter, then drift
back into place.
**Techniques:** sampling text into points, Skia Atlas for drawing thousands of sprites,
per-particle physics on the UI thread.

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
