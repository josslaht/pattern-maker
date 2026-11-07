# Decisions

Why things work the way they do. `docs/spec.md` has what the app does.

## The idea

- You edit one tile and it repeats. That's how quilts work, and it explains most of the structure: templates are quilt blocks and slots are patches. None of those words are on screen though.
- One canvas, two views. Tile is for making, Pattern is for seeing the repeat, and switching between them is a zoom, not a mode change.
- When in doubt, leave a control out. No zoom (Pattern does that), no start over, no per-shape stroke or opacity, and five colours at most.
- No canvas library. Everything comes from one tile, so an infinite canvas with free placement is the wrong model.

## Tile and shapes

- Every template shows the same list of shapes in the same order, as many as it has slots. Switching templates rearranges your shapes instead of swapping them for others.
- Grids fill out from the top left corner, not row by row, so a nine-patch starts as a four-patch with more around it. The quarter-square goes top, right, left, bottom for the same reason.
- Fill every slot only changes the slots you can see.
- 100% shape size means the shape touches the slot's edges. The art has uneven padding, so each shape has its own fit box.
- Arches and triangles sit on their flat side, so facing pairs make circles.
- Optical size evens out how heavy shapes look at smaller sizes, and fades out towards 100%.
- In triangle slots each shape is fitted on its own, as big as it fits. Turning rests its flat side on each of the three edges in turn, long edge first. Square slots turn in quarters.
- Only the tile in focus can be edited. Dropping on the copies too made the pattern jump around while carrying a shape across them.
- No dragging shapes between slots. Drop a new one from the tray instead.
- Shapes are open when the page loads and stay open while a slot is selected, because dragging one in is the first thing to try. Clicking away closes the selection first, then the shapes.

## Selecting and colour

- A slot is one selection, shape and patch together. Choosing between the two was fiddly and you couldn't tell which one you had. A colour goes to the shape, or to the patch if there's no shape.
- Clicking a colour does one thing. With a slot selected it paints it, with nothing selected it opens the picker. Opening a drawer deselects, and selecting closes the drawer.
- You can still drag colours, since it's the only way to colour every shape at once. Where you let go decides shape or patch, using the same hit test as a click.
- The background is a small chip next to the colours. With a slot selected it's that slot's background instead, for one click.
- Changing the background never makes anything disappear. Anything already in the new colour swaps to the old one, so changing back restores everything. Painting a shape the same colour as what's behind it on purpose is still allowed.
- No "no colour" button for patches. Painting a patch the background colour clears it, and so does Delete.
- When the tool picks a colour by itself it never hides a shape. When you do it, that's your call.
- Moods are named after art and design movements. The name is only in the tooltip, the colours say enough. Once you edit a colour no mood is marked.
- A colour dot opens its picker and Moods opens the moods, never both.
- A new mood washes over the pattern. Editing one colour follows the picker with no lag.
- Custom colour picker with a hex field. The browser's looks different everywhere and opens another popup. Hex means nothing to most people here, but it's handy for pasting a colour in.

## Bars and header

- No side panels. The canvas fills a rounded frame and all the controls float on top.
- The tile's bar sits under the tile and opens downwards. A bar above the tile plus the header made it top heavy.
- Tile is a button that unfolds the templates. Changing template is rare and seven outlines up front is a lot. Drawers stay open until you click away, so you can compare.
- The five colours are always visible. Trying colours is the most fun part and shouldn't take two clicks.
- The bar keeps the same corner radius folded or open. A pill radius that grew with the bar looked like a different thing.
- The bar is as wide as its buttons, with dividers between sections.
- The header is one floating bar: undo and redo, Tile / Pattern, Copy link and Save.
- Rotate and Remove are always there, just asleep until the slot has a shape. Popping them in moved the colours 45 px just as you reach for one.
- Tooltips only where the icon doesn't explain itself. Moods get one to name the movement.
- Tap Space to switch views, hold it to peek. Under 0.2 s is a tap, and nothing hides before that, or every tap would flicker the tools.
- Selection and open drawers stay while you look at the pattern, so you can tap Space, look and carry on.
- Narrow screens aren't designed yet. The bars wrap and the labels drop.

## Pattern view

- Just the pattern, filling the view. Everything about the repeat is in one bar at the bottom.
- Shift and Turn are labelled options, not thumbnails. Thumbnails of your own tile all looked the same, and the pattern is already the preview.
- Turn is None, Pinwheel, Mirror and Random. I cut Alternate because it mostly looked like Pinwheel.
- Plain names: "Alternate colours" and "Hide some tiles". "Hide tiles" sounded like all of them.
- Options that wouldn't change anything are hidden, including ones that look the same as an earlier option. A control that does nothing looks broken.
- A chosen option stays chosen when the tile stops showing it, so changing the tile back brings it back.
- Shuffle is a small dice next to what it re-rolls, and clicking Random again re-rolls too. The space for the dice is always there so nothing jumps.
- Hide some tiles hides exactly 3 in every 16. A random chance per tile could hide none.
- Alternate colours never touches the background, so shapes don't vanish into it.
- Dragging the pattern to shift it is cut. It was janky and I didn't have time to fix it.

## First visit and hints

- Every load starts with a short intro: the whole pattern, then the camera flies into the tile and the tools come in. It shows what the tool makes before asking anything, and that the tile and the pattern are one space.
- The starting pattern is a random pick from hand-made starters, because a generated one can't be guaranteed to look good. None use Random or Hide some tiles, so the tile you edit always explains the pattern. Only Pinwheel and Seigaiha keep a variation, because that's what they are.
- Every tool is there from the start. Hints point at things, they don't unlock them.
- Each hint suggests more than one thing, goes once any of it is done and doesn't come back. What you've tried is remembered across visits.
- The last hint suggests saving, under the Save button, once you've changed the repeat. It goes when Save is opened or after a few more changes.
- Hints are dark pills next to what they're about. In a corner they read as small print.
- Resting on the tile says a click selects the slot, until you've clicked one.
- No Space hint on touch screens.

## Saving

- Save has its own view over the whole window: preview, layouts, tiles across and PNG or SVG. These used to sit in the header.
- The preview is the actual file, drawn from the same SVG, so it can't differ from what you download. It morphs between layouts, cropped from the middle.
- Each layout is a small picture of the pattern in that shape, which reads faster than a name.
- Seven layouts: Phone, Tablet, Desktop, Square, A4, Repeat tile and Custom (64 to 8000 px a side). Custom clamps when you leave the field, so typing 1 on the way to 1200 doesn't flash a sliver.
- A repeat tile saves at 512 px per tile. Whole pixels keep the edges crisp and a 4 × 4 block is still only 2048 px.
- Saving flashes and knocks the view back a little, like a camera, and shows the file name. No toast.

## Undo and saved work

- Undo has buttons as well as shortcuts. Touch has no shortcuts, and seeing a way back makes it feel safe to play.
- Undo only covers the design, not the selection, view or layout.
- One drag is one undo step. A drag that ends where it started adds nothing.
- Your work survives a reload. Only the design comes back, and undo starts empty.
- Nothing is saved until you change something, so if you only looked you get a different starter next time.
- Copy link is how you keep or share a pattern. The whole design goes in the link after `#`, so there's still no backend, and a bookmark works as a saved version.
- Opening a shared link doesn't touch your own saved work until you change something. Then the link is cleared from the address bar, so a reload brings back your version, not the one you were sent.

## Motion

- The whole pattern reacts to a change. A dropped shape grows in and a rotated one swings round in every copy at once. Seeing a change across the repeat is the point of the tool.
- A dropped shape gets pressed in, since the preview already shows it at full size. Shapes from a click or undo grow in.
- Copies move into a new arrangement in a wave from the tile in focus. Turns rotate, mirrors flip, hidden tiles shrink away and swapped colours pop.
- Animations carry on from where things are on screen, not from where they were heading.
- Holding Space is quick with no bounce. It's a glance.
- A dropped colour blooms where you let go.

## How it's built

- Drag and drop is hand-written. Drop targets come from the tile's geometry through the camera, not from DOM elements.
- The ghost preview and the real drop use the same function.
- Every design change goes through `change` in the store, so undo covers everything. History keeps up to 100 whole designs, which is much simpler than recording how to reverse each change.
- Whether an option changes anything is decided by comparing what gets drawn: each copy's shapes and the colours at a grid of points.
- The design is saved on every change and checked when it's loaded. A broken one would break the page on every visit, so anything that doesn't check out is ignored.
- Shape or patch is decided by the shape's bounding box, and only the middle of a slot counts as the shape. Otherwise a 100% shape would leave no way to click its patch.
- The screen and saved files share one drawing path. Saving renders the screen's component to a string.
- Saved SVGs should open in design programs: colours are written out instead of `currentColor` and copies use `xlink:href`. I've only checked them in a browser so far.
- Patches and shapes get a 1 px stroke in their own colour so neighbours meet without a hairline. All the patches are drawn before any shapes, or the next copy's stroke draws over shapes along the shared edge.
- Colours on screen are CSS variables, so a mood change doesn't re-render every copy.
- Camera and shift animations write to the SVG directly instead of going through React.
- Big previews are drawn after the zoom, not during it.
- I checked the seams once in the browser, pixel by pixel. The tests check that every combination of settings repeats by its block.
- DialKit for tuning, in development only.
- No backend.

## Still open

- Offset arches don't make scales. A half circle is half as tall as it is wide, so there's always a gap between rows.
- Triangles don't fill their slot. They're wider than tall, so they stop short of the top.
- The minimum shape size needs tweaking.
- Short windows scroll the tallest drawers with nothing showing that they scroll.
- A repeat tile saves bigger than it needs to when a chosen option isn't showing.
- Moods are still placeholder colours.
