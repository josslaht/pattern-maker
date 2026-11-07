# Decisions

Why things work the way they do. `docs/spec.md` has what the app does.

## The idea

- You edit one tile and it repeats, the way quilts work. Templates are quilt blocks and slots are patches.
- One canvas with two views, Tile for making and Pattern for seeing the repeat. Switching is a zoom rather than a mode change, because they're the same pattern at two distances.

## Tile and shapes

- Every template shows the same list of shapes in the same order, as many as it has slots, so switching templates rearranges your shapes instead of swapping them for others.
- Grids fill out from the top left corner rather than row by row, so a nine-patch starts as a four-patch with more around it. The quarter-square goes top, right, left, bottom for the same reason.
- Fill every slot only changes the slots you can see, because a change you can't see shouldn't happen.
- 100% shape size means the shape touches the slot's edges. Each shape has its own fit box for this, since the art's padding is uneven.
- Arches and triangles sit on their flat side, so facing pairs make circles.
- Optical size evens out how heavy shapes look at smaller sizes and fades out towards 100%, where every shape touches anyway.
- In triangle slots each shape is fitted on its own, as big as it fits, and turning rests its flat side on each of the three edges, long edge first. Quarter turns don't fit a triangle.
- Only the tile in focus can be edited, because dropping on the copies too made the pattern jump around while carrying a shape across them.
- Shapes can't be dragged between slots. To swap one, drop a new one from the tray.
- Shapes are open on load and stay open while a slot is selected, because dragging one in is the first thing to try. Clicking away closes the selection first, then the shapes.

## Selecting and colour

- A slot is one selection, shape and patch together, because selecting them separately left people unsure which one they had. A colour goes to the shape, or to the patch if there's no shape.
- Clicking a colour paints the selected slot, or opens the picker with nothing selected. Opening a drawer deselects and selecting closes the drawer, so a click on a colour only ever means one thing.
- Colours can still be dragged, since it's the only way to colour every shape at once. Where you let go decides shape or patch, using the same hit test as a click.
- The background is a small chip next to the colours. With a slot selected it's that slot's background, for one click only.
- Changing the background swaps anything already in the new colour to the old one, so nothing disappears and changing back restores everything. Painting a shape the colour behind it on purpose is still allowed.
- No "no colour" button for patches. Painting a patch the background colour clears it, and so does Delete.
- When the tool picks a colour by itself it never hides a shape. When you do it, it's on purpose.
- Moods are named after art and design movements. The name is only in the tooltip, since the colours say enough. Editing a colour unmarks the mood.
- A colour dot opens its picker and Moods opens the moods, never both, because changing one colour and changing all five are different things.
- A new mood washes over the pattern, while editing one colour follows the picker with no lag, so the pattern always feels like it's listening.
- A custom colour picker with a hex field, because the browser's looks different everywhere and opens another popup. Hex is for pasting a colour in.

## Bars and header

- No side panels. The canvas fills a rounded frame and the controls float on top, so the pattern gets the space.
- The tile's bar sits under the tile and opens downwards, because a bar above the tile as well as the header made it top heavy. On a phone it's docked at the bottom like the Pattern bar, and opens upwards so the buttons stay under your thumb.
- Tile is a button that unfolds the templates, because changing template is rare and seven outlines up front is a lot. Drawers stay open until you click away, so you can compare.
- The five colours are always visible, because trying colours is the most fun part and shouldn't take two clicks.
- The bar keeps the same corner radius folded or open, because a pill radius that grew with the bar looked like a different thing.
- The bar is as wide as its buttons, with dividers between sections, because gaps alone didn't show where a section ended.
- The header is one floating bar: undo and redo, Tile / Pattern, Copy link and Save.
- Rotate and Remove are always there and wake up when the slot has a shape, because popping them in moved the colours 45 px just as you reach for one.
- Tooltips only where an icon doesn't explain itself. Moods get one to name the movement.
- Tap Space to switch views, hold it to peek. Nothing hides until the press is longer than a tap, otherwise every tap would flicker the tools.
- Selection and open drawers stay while you look at the pattern, so you can tap Space, look and carry on.
- On touch the canvas is the Space key: a tap beside the tile or anywhere on the pattern switches views, and a held finger peeks. A tap on the tile still selects, and a tap away drops the selection before it switches, so a stray tap never loses your place.
- On a phone there's no frame round the canvas, because the room matters more than the frame there. The tile is as wide as fits, with a strip of the copies left at each side so you can still see it repeats.
- Tile, Shapes and Moods keep their labels on a phone, since they still fit. Save only drops its label where the header would otherwise overflow.

## Pattern view

- Just the pattern, filling the view, with everything about the repeat in one bar at the bottom.
- Shift and Turn are labelled options rather than thumbnails, because thumbnails of your own tile all looked the same and the pattern is already the preview.
- Turn is None, Pinwheel, Mirror and Random. Alternate is gone because it mostly looked like Pinwheel.
- "Alternate colours" and "Hide some tiles", because "Hide tiles" sounded like all of them.
- Angle pattern turns the whole pattern 45°. Only 45°, because other angles look like mistakes.
- No button to turn the whole tile. With every copy turning with it, it only rotates the pattern you already have.
- Options that wouldn't change anything are hidden, including ones that look the same as an earlier option, because a control that does nothing looks broken.
- A chosen option stays chosen when the tile stops showing it, so changing the tile back brings it back.
- Shuffle is a small dice next to what it re-rolls, and clicking Random again re-rolls too. The space for the dice is always there so nothing jumps.
- Hide some tiles hides exactly 3 in every 16, because a random chance per tile could hide none.
- Alternate colours leaves the background out, so shapes don't vanish into it.
- No dragging the pattern to shift it, because it was too janky to keep.

## First visit and hints

- Every load starts with a short intro: the tile appears in its frame, the copies grow out from it into the whole pattern, then the camera flies into the tile and the tools come in. It shows that one tile makes the pattern before asking anything, and that the tile and the pattern are one space.
- The starting pattern is a random pick from hand-made starters, because a generated one can't be guaranteed to look good. None use Random or Hide some tiles, so the tile you edit always explains the pattern. Pinwheel and Seigaiha keep their variation because that's what they are.
- Every tool is there from the start. Hints point at things rather than unlock them.
- Each hint suggests more than one thing, goes once any of it is done and doesn't come back, so you can explore in any order. What you've tried is remembered across visits.
- The last hint suggests saving, under the Save button, once you've changed the repeat. It goes when Save is opened or after a few more changes, so it doesn't hang around.
- Hints are dark pills next to what they're about, because in a corner they read as small print.
- Resting on the tile says a click selects the slot, until you've clicked one.
- On touch screens the look hint talks about tapping and holding instead of Space.

## Saving

- Save has its own view over the whole window: preview, layouts, tiles across and PNG or SVG. These are all about the file, so they moved out of the header.
- The preview is the actual file, drawn from the same SVG, so it can't differ from what you download. It morphs between layouts, cropped from the middle.
- Each layout is a small picture of the pattern in that shape, because a picture reads faster than a name.
- Seven layouts: Phone, Tablet, Desktop, Square, A4, Repeat tile and Custom (64 to 8000 px a side). Custom clamps when you leave the field, so typing 1 on the way to 1200 doesn't flash a sliver.
- A repeat tile saves at 512 px per tile, because whole pixels keep the edges crisp and a 4 × 4 block is still only 2048 px.
- Saving flashes and knocks the view back a little, like a camera, and shows the file name. That's enough, so no toast.

## Undo and saved work

- Undo has buttons as well as shortcuts, because touch has no shortcuts and seeing a way back makes it feel safe to play.
- Undo only covers the design, not the selection, view or layout, because those are where you're looking rather than what you made.
- One drag is one undo step, and a drag that ends where it started adds nothing.
- Your work survives a reload. Only the design comes back, and undo starts empty.
- Nothing is saved until you change something, so if you only looked you get a different starter next time.
- Copy link is how you keep or share a pattern. The whole design goes in the link after `#`, so there's no backend, and a bookmark works as a saved version.
- Opening a shared link doesn't touch your own saved work until you change something. Then the link is cleared from the address bar, so a reload brings back your version rather than the one you were sent.

## Motion

- The whole pattern reacts to a change. A dropped shape grows in and a rotated one swings round in every copy at once, because seeing a change across the repeat is the point of the tool.
- A dropped shape gets pressed in, since the preview already shows it at full size. Shapes from a click or undo grow in.
- Copies move into a new arrangement in a wave from the tile in focus. Turns rotate, mirrors flip, hidden tiles shrink away and swapped colours pop.
- Animations carry on from where things are on screen, not from where they were heading, because restarting made tiles jump.
- Holding Space is quick with no bounce, because it's a glance.
- A dropped colour blooms where you let go, since paint has nowhere to fly to.

## How it's built

- Drag and drop is hand-written, because drop targets come from the tile's geometry through the camera, not from DOM elements.
- The ghost preview and the real drop use the same function, so the preview is always the real result.
- Every design change goes through `change` in the store, so undo covers everything. History keeps up to 100 whole designs, because that's much simpler than recording how to reverse each change.
- Whether an option changes anything is decided by comparing what gets drawn: each copy's shapes and the colours at a grid of points.
- The design is saved on every change and checked when it's loaded, because a broken one would break the page on every visit.
- Shape or patch is decided by the shape's bounding box, and only the middle of a slot counts as the shape, otherwise a 100% shape would leave no way to click its patch.
- The screen and saved files share one drawing path, so a file always matches what's on screen.
- Saved SVGs write colours out instead of `currentColor` and use `xlink:href`, so they open in design programs.
- Patches and shapes get a 1 px stroke in their own colour so neighbours meet without a hairline. All the patches are drawn before any shapes, otherwise the next copy's stroke draws over shapes along the shared edge.
- Colours on screen are CSS variables, so a mood change doesn't re-render every copy.
- Camera and shift animations write to the SVG directly instead of going through React, because re-rendering the pattern every frame held up the controls.
- Big previews are drawn after the zoom rather than during it, so the zoom stays smooth.
- DialKit for tuning in development only, because most values are settled by eye.
