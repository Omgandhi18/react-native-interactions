# Ideas

Big, full-screen interactions, built, pushed and posted one a day. Each one is a single
post that stands on its own: no numbering, no series, no follow-ups.

Sizes: **S** takes 1–2 hours, **M** an evening, **L** 1–2 days. Every piece should run in
Expo Go (Skia, Reanimated, Gesture Handler, expo-sensors, expo-haptics, expo-audio,
expo-location). For public-domain art, check the licence of each image or scan before
using it and credit the source in the README.

When a piece is posted, move it from the list into Posted.

## Posted

| Interaction | Difficulty |
|---|---|
| Monsoon window | Medium–hard |
| Holographic tilt card | Medium |
| Marble Dust | Medium–hard |

### Monsoon window
The screen is a rain-streaked, foggy window. Drag a finger to wipe the fog away and see a
blurred city behind it. Drops run down the glass, and tilting the phone changes which way
they slide.
**Techniques:** Skia shaders (blur, refraction through drops), a wipe mask that slowly
fogs back over, drop simulation, motion sensor.

### Holographic tilt card
A full-screen card (a ticket or ID) with a holographic foil shine that follows how you
tilt the phone.
**Techniques:** Skia shader for the foil, motion sensor, 3D perspective transform.

### Marble Dust
Michelangelo's David made of thousands of grains of marble dust. Swipe through him and they
scatter, then drift back into place; tap and he bursts apart.
**Techniques:** sampling a public-domain 3D scan into evenly spaced points with baked shadows,
Skia Atlas for drawing thousands of sprites, per-particle physics on the UI thread.

## Build order

Build and post the list in order, from #1 Hourglass to #150 Turntable, so the top of the
list is always the next build. Stay two or three pieces ahead: large pieces can bunch up
(#1 and #2, then #11, #12 and #13), so start those a day or two early.

## The list

150 pieces across 14 themes: 21 large, 73 medium and 56 small.

### Particles and swarms

| # | Piece | What you do | Under the hood | Size |
|---|---|---|---|---|
| 1 | Hourglass | Flip the phone and 6,000 grains pour through the neck and pile into a cone. | Granular flow on the UI thread. Sand runs at the same rate whether the top is full or nearly empty, which is why hourglasses keep time. | L |
| 2 | Murmuration | Thousands of starlings swirl across a dusk sky. Your finger is a falcon they split around. | Flocking (boids) with a spatial hash, drawn with drawAtlas. | L |
| 3 | Fireflies | Tap the jar to wake the fireflies. They blink at random, then slowly fall into sync. | Coupled oscillators (the Kuramoto model), the same maths as an audience's applause syncing up. | M |
| 4 | Iron Filings | Drag a magnet under a sheet of paper and the filings stand up along the field lines. | A dipole field per particle, line sprites. | M |
| 5 | Dandelion | Blow on the mic and the seeds lift off and drift away. A new head grows back. | The mic level from expo-audio drives the wind. | M |
| 6 | Crumble to Delete | Swipe a list row away and it crumbles into dust. Undo pulls the dust back into the row. | The row is drawn to an image and its pixels become particles. | M |
| 7 | Snow Globe | Shake the phone. Snow swirls through the water and settles on a tiny town. | Shake detection, heavily damped particles. | M |
| 8 | Mercury | Beads of mercury roll as you tilt, merge when they touch and split when you swipe through them. | Metaballs in a Skia shader, gravity from the motion sensor. | M |
| 9 | Sparkler | Draw with a sparkler. Sparks spit from your fingertip and the trail glows and fades. | Additive blending. | S |
| 10 | Draw-a-Firework | Draw any shape and let go: a firework bursts in exactly that shape. | The stroke is resampled into burst targets. | S |
| 11 | Ink in Water | Touch the water and ink blooms and curls through it. | A fluid simulation on a coarse grid, drawn with a shader. | L |
| 12 | Ferrofluid | A pool of black liquid grows spikes that reach for your finger. | A height field plus a spike shader with sharp highlights. | L |

### Light, glass and materials

| # | Piece | What you do | Under the hood | Size |
|---|---|---|---|---|
| 13 | Sequins | Swipe across a sequin cushion and thousands of sequins flip colour, each catching the light as it turns. | Per-sequin flip state and lighting, all in one drawAtlas call. | L |
| 14 | Soap Bubble | Blow to inflate a bubble whose colours swirl. Tap to pop it. | Thin-film interference: the colours come from the film's thickness. | M |
| 15 | Prism | Drag a beam of white light into a prism and it fans out into a spectrum. | 2D ray tracing where each wavelength bends by a different amount. | M |
| 16 | Magnifier | Drag a lens over a page. The text bends at the rim with a rainbow fringe. | Refraction and chromatic aberration in a shader. | S |
| 17 | Lamp and Shadows | Drag a lamp around a desk. Every object's soft shadow stretches and swings. | Signed-distance soft shadows in a shader. | M |
| 18 | Pool Caustics | Light dances on a pool floor. Drag to make waves that bend it. | A wave grid plus a caustics shader. | L |
| 19 | Liquid Chrome | A word in liquid chrome ripples where you touch it, reflecting a sky. | Rippled normals plus an environment map. | M |
| 20 | Lenticular | A card flips between two pictures as you tilt it, like a lenticular print. | Interleaved strips, tilt from the motion sensor. | S |
| 21 | Neon | A neon sign stutters on and flickers when you tap the glass. | Bloom from blurred layers. | S |
| 22 | Bokeh | Pinch to pull focus, and the city lights behind bloom into soft discs. | Depth-based blur with a disc-shaped kernel. | M |
| 23 | Crumple | Pinch a sheet of paper into a ball, then pull it flat with every crease left in. | Mesh deformation with crease shading, drawVertices. | L |
| 24 | Cracked Ice | Tap a frozen pane. Cracks race out from your finger and branch. | Crack growth, with refraction along the cracks. | M |
| 25 | CRT | An old TV switches on with a collapsing line. Turn the dial to flick channels through static. | A scanline, curvature and noise shader. | M |

### Weather, water and fire

| # | Piece | What you do | Under the hood | Size |
|---|---|---|---|---|
| 26 | Campfire | Poke the fire. Sparks fly and the logs shift. | A fire shader plus spark particles. | M |
| 27 | Candle | Blow on the mic to put the candle out and watch the smoke curl. Tap to relight it. | The mic level and a flame shader. | S |
| 28 | Koi Pond | Tap the water to make ripples, and the koi dart away from them. | The wave equation on a grid, plus fish that steer. | L |
| 29 | Level Sea | Tilt the phone and the sea stays level with the real horizon. | The gravity vector from the motion sensor. | S |
| 30 | Aurora | Drag across the night sky to paint aurora curtains that ripple. | Layered noise curtains, additive blending. | M |
| 31 | Lightning | Draw a path and lightning strikes along it, branching, with a flash. | Midpoint-displacement branches. | S |
| 32 | Clouds | Push clouds around, and sunbeams break through the gaps. | Noise clouds plus a light-shaft shader. | M |
| 33 | Golden Hour | Drag the sun across the sky. The light, colours and shadows follow. | Sky colour from a scattering approximation: sunsets turn red because the light crosses more air. | M |
| 34 | Snow on the UI | Snow settles on the buttons and text of a real screen. Tap a button to shake it off. | Snow depth stored per UI element. | M |
| 35 | Vortex | Stir your finger in circles to whip up a whirlpool that drags everything in. | A vortex field driven by how fast your finger circles. | S |
| 36 | Wind Chimes | Swipe through the chimes. Each one rings its own note when it's struck. | Pendulums plus expo-audio samples. | M |

### Public-domain art (check every licence)

| # | Piece | What you do | Under the hood | Size |
|---|---|---|---|---|
| 37 | The Great Wave | Swipe and Hokusai's wave crashes, foam spraying off the crest. | A displacement shader over an open-access print, plus foam particles. | L |
| 38 | Starry Night in Strokes | The painting is rebuilt from 20,000 brush strokes that follow its swirls. Drag to stir them. | A flow field read from the image, stroke sprites. | L |
| 39 | The Milkmaid's Pour | Tilt the phone and Vermeer's milk pours faster or slower. | An animated stream over the Rijksmuseum's open-access image. | M |
| 40 | Grande Jatte in Dots | Pinch into Seurat's painting until it comes apart into its dots. | The image sampled into dots whose spacing follows the zoom. | M |
| 41 | Hiroshige's Shower | Hiroshige's rainy bridge is split into layers that shift as you tilt, and the rain slants with gravity. | Layered parallax, tilted rain. | M |
| 42 | Alice | Turn the pages of Alice's Adventures in Wonderland, with Tenniel's illustrations. The page curls realistically under your finger, shading included. | Page-curl maths in a Skia shader, a fold line that follows your finger, lighting. | L |
| 43 | Gold Coin | Flick an ancient gold coin. It spins, wobbles and lands heads or tails. | A 3D disc with metallic shading, from an open-access museum photo. | M |
| 44 | Apollo 11 | Spin the Apollo 11 command module, then flick it down and watch the heat shield glow. | A Smithsonian 3D scan as a point cloud (check it's CC0). | L |
| 45 | Fossil Dig | Brush sand away to uncover a fossil skeleton. | A wear-away mask plus falling sand. | M |
| 46 | Dürer's Rhinoceros | Trace with your finger and the woodcut engraves itself line by line. | Path reveal along the hatching. | S |
| 47 | Mondrian | Drag the black lines. The coloured blocks resize around them and snap to a grid. | Constraint layout, haptic snaps. | S |

### Sensors and tilt

| # | Piece | What you do | Under the hood | Size |
|---|---|---|---|---|
| 48 | Spirit Level | A liquid bubble wobbles into the centre, with a click when you're level. | The motion sensor plus a spring. | S |
| 49 | Compass | A brass compass whose needle swings and settles with a damped wobble. | The magnetometer heading and a damped spring. | S |
| 50 | Marble Maze | Tilt a wooden maze to roll a marble into the hole. | Ball physics against walls. | M |
| 51 | Ball Pit | Hundreds of balls slosh as you tilt. Shake and they bounce. | Verlet circles with a spatial hash. | M |
| 52 | Zen Garden | Rake patterns into sand around stones. Shake to smooth it. | A height field with raking and shading. | M |
| 53 | Euler's Disk | Spin a coin on a table. As it settles it spins faster and faster, then stops dead. | Euler's disk: the wobble speeds up as the coin falls flat. | M |
| 54 | Water Bottle | Water sloshes in a bottle as you tilt and shake it. | A sloshing surface made of springs. | M |
| 55 | Dice | Shake to roll two dice that tumble and settle. | Rigid-body cubes with projected faces. | L |
| 56 | Pour | Tilt to pour coffee from one cup into another, foam and all. | A 2D particle fluid. | L |
| 57 | Voice Ring | Speak, and a ring of particles pulses with your voice. | expo-audio metering. | S |
| 58 | Sundial | A sundial that casts the real sun's shadow for where you are right now. | Sun position from your location and the time. | M |

### Controls and UI moments

| # | Piece | What you do | Under the hood | Size |
|---|---|---|---|---|
| 59 | Pull-Cord Lamp | Pull the lamp's cord to switch the app between light and dark. | Rope physics plus a light shader. | M |
| 60 | Paper Shredder | Drag a card into a shredder and it comes out in curling strips. | The card is sliced into strips, each with its own physics. | M |
| 61 | Paper Plane Send | Hit send and the message folds itself into a paper plane and flies off. | Fold keyframes plus a flight path. | M |
| 62 | Inflate to Like | Hold the heart to inflate it. Let go early to send a like; hold too long and it pops into confetti. | A pressure spring plus confetti. | S |
| 63 | Match Strike | Swipe a match across the striker to confirm. It flares and catches. | A swipe-speed threshold plus a flame shader. | S |
| 64 | Measuring Tape | Pull out a tape measure with ticks under your thumb. Let go and it whips back. | Spring retraction plus haptic ticks. | S |
| 65 | Odometer | A stepper whose digits roll like a mechanical counter, carrying over with a clunk. | Rolling digits with momentum. | S |
| 66 | Gooey Tabs | The tab highlight stretches like liquid from one tab to the next. | A metaball path. | S |
| 67 | Radial Menu | Long-press and a menu blooms around your thumb. Slide to choose. | Springs plus selection by angle. | S |
| 68 | Ink Checkbox | Tick a box and a hand-drawn check is inked in, bleeding slightly. | A stroke animation plus an ink-bleed shader. | S |
| 69 | Fuse Progress | A progress bar that burns like a fuse, with sparks at the tip. | A progress-driven path plus sparks. | S |
| 70 | Mood Slider | One line morphs from a frown to a grin as you drag. | Path interpolation. | S |
| 71 | Abacus | Enter a number by flicking abacus beads. | Snapping beads plus haptics. | M |
| 72 | Paint Palette | Mix paint blobs with your finger. Blue and yellow make green, not grey. | A pigment-mixing model, because averaging RGB gives grey. | M |
| 73 | Rotary Dial | Enter a PIN on a rotary dial that whirrs back after each digit. | A rotation gesture plus a return spring. | M |
| 74 | Plug It Back In | When you're offline the cable dangles. Drag the plug into the socket to retry. | Rope physics plus a snap. | S |

### Type and text

| # | Piece | What you do | Under the hood | Size |
|---|---|---|---|---|
| 75 | Melting Type | Drag across a word and the letters soften and drip like hot wax. | Displacement plus drip particles. | M |
| 76 | Rubber Type | Grab a letter and stretch it like rubber. It snaps back. | Warped glyph paths. | M |
| 77 | Typewriter | Type, and the carriage slides, the keys strike and the bell rings at the end of the line. | Key strikes, uneven ink, expo-audio. | M |
| 78 | Split-Flap Board | A departures board flips to new text with a clatter. | 3D flap rotation with staggered timing. | M |
| 79 | Fridge Words | Drag word magnets around a fridge. They swing as you move them. | A pendulum driven by the drag's acceleration. | S |
| 80 | Text on a Path | Draw a line and a sentence flows along it. | Glyphs placed by distance along the path. | S |
| 81 | Ransom Note | Type a sentence and each letter is cut from a different magazine, wobbling into place. | Per-letter styles plus springs. | S |
| 82 | Chiselled | A name is carved into marble, with chips flying. | A progressive carving mask plus chip particles. | M |
| 83 | Fountain Pen | Sign your name. The ink pools where you slow down and thins where you rush. | Stroke width from finger speed. | S |
| 84 | Rubber Stamp | Ink a stamp and press it. The print comes out patchy, like the real thing. | Noise-masked ink coverage. | S |

### Paper, cards and transitions

| # | Piece | What you do | Under the hood | Size |
|---|---|---|---|---|
| 85 | Card Toss | Flick cards off a stack. They spin away with the speed you gave them. | Velocity plus spin. | S |
| 86 | Instant Photos | Scatter a pile of instant photos, pull one out, then shake to tidy them. | Card physics with friction. | M |
| 87 | Card Fan | Spread a deck into a fan with one drag. | An arc layout that follows your finger. | S |
| 88 | Folding Map | Unfold a paper map panel by panel. | 3D folds with shading. | M |
| 89 | Sticker Peel | Peel a sticker off its backing and stick it anywhere on the screen. | A peel curl that follows the drag, with the sticker's back and shadow. | L |
| 90 | Infinite Zoom | Pinch into a picture forever: every picture holds the next. | A recursive (Droste) zoom. | M |
| 91 | Taffy Reorder | Drag a list row and it stretches out of its slot like taffy. | A gooey path between the slot and your finger. | S |
| 92 | Rubber Overscroll | Overscroll a list and the rows squash and stretch against the edge. | An overscroll spring plus scaling. | S |
| 93 | Envelope | Open an envelope: the flap lifts, and the letter slides out and unfolds. | Layered 3D steps. | M |
| 94 | Ticket Stub | Tear a ticket along its perforation. The torn edge stays ragged. | A tear path, then two pieces with their own physics. | S |
| 95 | Receipt | A receipt prints line by line and curls. Tear it off. | Paper curl plus a tear. | S |

### Data that feels physical

| # | Piece | What you do | Under the hood | Size |
|---|---|---|---|---|
| 96 | Pie Slice | Pull a slice out of a pie chart. It stretches and snaps back, dropping crumbs. | A spring plus crumb particles. | S |
| 97 | Magnetic Scrubber | Scrub a line chart and the cursor snaps to each data point with a tick. | Snapping plus haptics. | S |
| 98 | Bubble Pack | Data bubbles pack themselves together, jostle, and can be dragged around. | Circle collisions. | M |
| 99 | Coin Jar | Spending drops coins into a jar, where they stack and settle. | Coin physics. | M |
| 100 | Commit Lawn | A year of commits as a lawn: busier days grow taller grass. Swipe to make wind. | Grass blades as springs. | M |
| 101 | Force Graph | Grab a node in a network graph and fling it. The graph rearranges itself. | A force-directed layout. | M |
| 102 | Ride Replay | A mountain route draws itself. Scrub the elevation graph and a bike rides it, with layered mountains moving at different speeds. | Path drawing and measuring, position along a path, layered parallax. | L |

### Maths and generative

| # | Piece | What you do | Under the hood | Size |
|---|---|---|---|---|
| 103 | Coral | Touch to seed patterns that grow into coral, stripes or spots. | Reaction–diffusion (Gray–Scott) on offscreen surfaces. | L |
| 104 | Marbling | Drop paint on water and drag through it to make marbled paper. | Exact marbling transforms, so the lines never blur however much you stir. | M |
| 105 | Fourier Drawing | Draw any shape, and circles spinning on circles redraw it. | A discrete Fourier transform. | M |
| 106 | Mandelbrot | Pinch deep into the Mandelbrot set until the GPU runs out of decimal places. | A shader, and where 32-bit floats give up. | M |
| 107 | Times-Table Cardioid | Slide a multiplier, and lines between points on a circle form a cardioid, then flowers. | Multiplication around a circle (modular arithmetic). | S |
| 108 | Harmonograph | Two pendulums draw a slowly fading figure. Drag to change their ratio. | Damped Lissajous curves. | S |
| 109 | Double Pendulum | Two pendulums released a hair apart end up nowhere near each other. | Chaos, with RK4 integration. | S |
| 110 | Gear Drawing | Drag a gear around inside a ring and its pen draws loops. | Hypotrochoids. | M |
| 111 | Fractal Tree | A fractal tree bends in the wind. Tap for autumn and the leaves fall. | Recursive branches on springs. | M |
| 112 | Voronoi Glass | Tap to add a pane of stained glass, then tilt to move the sun behind it. | Voronoi cells plus light. | M |
| 113 | Life | Paint cells and watch the Game of Life evolve, glowing. | A cellular automaton in a shader. | S |
| 114 | Truchet | Tap tiles to rotate them, and the curves reconnect into new paths. | Truchet tiles. | S |
| 115 | Kaleidoscope | Draw once and it mirrors twelve ways. Rotate the phone to turn it. | Mirror transforms plus the motion sensor. | S |

### Toys and tactile objects

| # | Piece | What you do | Under the hood | Size |
|---|---|---|---|---|
| 116 | Bubble Wrap | Pop the bubbles. Each one dimples, pops and stays flat. | Per-bubble state plus haptics. | S |
| 117 | Zipper | Unzip the screen to reveal the next one. | Teeth that separate along the pull. | M |
| 118 | Pottery Wheel | Shape a spinning vase with your finger. | A surface of revolution with lighting. | L |
| 119 | Newton's Cradle | Pull back a ball and let it go. The knock passes through to the other end. | Impulse transfer. | S |
| 120 | Geoboard | Stretch rubber bands over pins into shapes. | Bands that snap around the pins. | S |
| 121 | Pin Tumbler | Turn a key in a cutaway lock and watch the pins line up. | Pin heights from the key's cuts. | M |
| 122 | Wind-Up Toy | Wind the key and let go. The toy walks off, slowing down. | Spring energy turned into speed. | M |
| 123 | Yo-yo | Flick a yo-yo down. It spins at the bottom, then climbs back. | String plus rotation. | S |
| 124 | Fortune Teller | Pinch a paper fortune teller open and closed. | Origami folds in 3D. | M |
| 125 | Scratch Card | Scratch off the foil to reveal the prize, with flakes flying. | A mask plus flakes. | S |
| 126 | Bead Curtain | Swipe through a bead curtain. The strands swing and clack. | Verlet chains. | M |
| 127 | Window Blinds | Pull the cord to raise the blinds, and twist to tilt the slats and let light in. | Slat rotation plus light stripes. | M |

### Food

| # | Piece | What you do | Under the hood | Size |
|---|---|---|---|---|
| 128 | Latte Art | Pour milk into espresso and drag to draw a heart in the foam. | The foam texture carried along by the flow. | L |
| 129 | Honey Drizzle | Drag to drizzle honey. The stream coils on itself where it lands. | Liquid rope coiling. | M |
| 130 | Pizza Pull | Pull a slice away and the cheese stretches into strands that snap. | Strands as springs that break. | M |
| 131 | Jelly on a Plate | Tap the plate and the jelly wobbles. | A soft body made of springs. | S |
| 132 | Ice Cream Scoop | Drag the scoop through the tub and a curl of ice cream forms. | A curl that grows along the drag. | M |

### Time, space and living things

| # | Piece | What you do | Under the hood | Size |
|---|---|---|---|---|
| 133 | Skeleton Watch | A watch face with the movement showing, every gear turning at the right speed. | Gear trains. | M |
| 134 | Moon Phase | Today's moon. Drag to scrub through its phases. | Terminator shading. | S |
| 135 | Orrery | A brass solar system. Drag to scrub the date. | Orbital periods. | M |
| 136 | Black Hole | Drag a black hole across a starfield and watch it bend the light behind it. | A gravitational-lensing shader. | M |
| 137 | Planet | Spin a planet, and city lights come on along its night side. | A day/night line plus a glowing atmosphere. | M |
| 138 | Orbits | Fling moons around a planet and see which ones stay in orbit. | Gravity plus trails. | S |
| 139 | Comet | Drag a comet around the sun. Its tail always points away from the sun, not behind the comet. | The solar wind sets the tail's direction. | S |
| 140 | Fur | Stroke a cat's fur. It parts and lies the way you brushed it. | Thousands of hair strands. | L |
| 141 | Tentacle | A tentacle reaches for your finger and curls around it. | FABRIK inverse kinematics. | S |
| 142 | Googly Eyes | A page of googly eyes whose pupils rattle when you shake the phone. | Pupil physics. | S |
| 143 | Jellyfish | Tap and a jellyfish pulses and swims, its tentacles trailing. | Bell pulses plus Verlet tentacles. | M |
| 144 | Growing Vine | A vine grows toward your finger and curls into leaves. | Growth toward light plus an L-system. | M |
| 145 | Butterfly | Hold still and a butterfly lands on your finger. | A flight path plus wing flaps. | S |

### Sound

| # | Piece | What you do | Under the hood | Size |
|---|---|---|---|---|
| 146 | Kalimba | Pluck the tines of a thumb piano. | Samples plus vibrating tines. | M |
| 147 | Music Box | Place pins on the cylinder and turn the crank to play your tune. | Pluck timing against the comb. | L |
| 148 | Singing Bowl | Circle the rim with your finger and the bowl hums louder. | Finger speed drives the volume. | M |
| 149 | Drum Pads | Hit the pads and rings ripple across them. | Ripples plus samples. | S |
| 150 | Turntable | Scratch a spinning record. The grooves shimmer as it turns. | Groove highlights plus spin inertia. | M |
