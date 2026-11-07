# Pattern maker

A small web app for making repeating patterns out of simple shapes. It's meant for people who have never made a pattern and don't know the vocabulary.

Live at [laht.design/pattern-maker](https://laht.design/pattern-maker).

## How it works

You work on one square tile, and the tile repeats to make the pattern. There's one canvas with two views, and switching between them zooms the camera.

- **Tile** is where you make it. Pick how the tile is split up, drag shapes into the slots and click a colour to paint what's selected. There are five colours shared by everything, plus a few moods that swap all five at once.
- **Pattern** is where you see it repeat. Shift every other row or column, turn the tiles, alternate colours between tiles or hide some of them.
- **Save** opens a view for picking a size (phone, tablet, desktop, square, A4, a seamless repeat tile or custom), how many tiles across, and PNG or SVG.

Tap Space to switch views. Hold it to see the pattern without the controls.

## Running it

```bash
npm install
npm run dev      # app and tuning panel
npm test         # pattern logic
npm run lint
npm run build    # type check and production build
```

In development there's a DialKit panel with every size, timing and spring that was set by eye. Production doesn't load it.

## What's in here

```
src/pattern/   pattern maths, hit testing and drops, no React, unit tested
src/state/     the Zustand store and what's saved in the browser
src/canvas/    the SVG canvas, camera, drag and drop, motion and saving
src/controls/  the bars, the Save view, colour picker and hints
src/tuning/    tunable values, in config.ts
data/          the ten shapes
docs/spec.md   what the app does
DECISIONS.md   why it works the way it does
```

React 19, Vite, TypeScript, Zustand, Motion and shadcn (Base UI, Outfit, Lucide). The canvas is a single hand-written SVG and drag and drop uses plain Pointer Events. No backend, it's a static site on Vercel.
