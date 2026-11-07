# Pattern maker

A pattern maker for people with no pattern vocabulary.

- `README.md`: what this is and how to run it.
- `docs/spec.md`: what to build. Where anything disagrees with the spec, the spec wins. "Cut from scope" stays cut unless Joosep says otherwise.
- `DECISIONS.md`: the decisions that stand, and why, grouped by topic. When one changes, edit its line rather than adding a new one. Write it the way Joosep would: short, plain, first person where it fits, no implementation trivia.

## What matters

1. **Looking matters more than engineering.** Scale, spacing, colour, what happens where it repeats, and which controls deserve to exist. When in doubt, leave a control out.
2. **It should feel playful.** Motion and interaction design are a main part of the product, not polish for the end. Treat every pick up, hover, drop, snap and camera move as a design decision. Direct manipulation beats controls wherever it stays obvious.

## Stack

React 19, Vite 8, TypeScript 7, oxlint, oxfmt. No backend; hosted on Vercel as a static site.

- **UI:** shadcn with the `b50Kl3fhS` preset (`base-maia`: Base UI, Outfit, Lucide). Use its tokens for the interface. Colours in a pattern come only from the pattern's five-colour palette.
- **Canvas:** one SVG with hand-written transforms, no canvas library.
- **Dragging:** Pointer Events by hand. Drop targets come from the tile's geometry through the camera, so DOM-based drag libraries do not fit.
- **State:** Zustand.
- **Motion:** Motion, with `MotionConfig reducedMotion="user"`.
- **Tests:** Vitest for pure pattern logic only.

## Architecture

- `src/pattern/`: plain functions and data, with no React or DOM. Pattern maths, hit testing and drops live here and are unit tested.
- Preview and drop use the same function, so the ghost preview is the real result.
- World coordinates are tile units, with the master at (0,0) to (1,1). Tile and Pattern are two camera positions over the same world.
- Screen and saving share one drawing path, so a saved file always matches the Pattern view.
- Only the design goes in undo history. Selection, drawers and drag state do not.

## Tuning

Any value settled by eye goes in `src/tuning/config.ts`, including every spring. Never hard-code one at a call site.

- Read values with `useTuning`, or `useTuning.getState()` outside React.
- `npm run dev` shows the DialKit panel. Production never loads it, so `dialkit` stays out of the bundle.
- Panel values persist in the browser. To keep a value, use the panel's Copy button and update its default in `config.ts`; otherwise it only exists on that machine.

## Commands

```bash
npm run dev      # app and tuning panel
npm test         # pattern logic
npm run build    # type check and production build
npm run lint
npm run format
```

Run `npm test`, `npm run lint` and `npm run build` before committing. For UI changes, also look at the result in a browser.

Code style comes from oxfmt: no semicolons, single quotes.
