# Pattern maker spec

## Context

A small web pattern maker: a person makes a seamless repeating pattern from the ten shapes in `data/motifs/` and takes it away as an image.

- **Who it is for:** someone who is not a designer and has no vocabulary for patterns. No control may rely on words like lattice, half-drop, hue or symmetry.
- **Framing:** quilts and printed textiles. Tiles are quilt blocks, slots are patches, the background is the backing. Centuries of non-designers have made patterns this way, and the framing explains every structural choice below.
- **Guiding principle:** a few decisions made well rather than every feature made adequately. What matters is scale, spacing, colour, what happens where it repeats, and which things deserve a control. When in doubt, leave a control out.
- **Feel:** direct manipulation first. Changes show live and immediately; dragging and dropping beats forms and sliders wherever it stays obvious.

## Core model

The user edits one tile; the tile repeats in a square grid to make the pattern. There is one space, never a separate tile editor.

1. **Tile:** a square divided into slots by a template (a quilt block).
2. **Slot:** holds at most one shape, plus an optional patch colour that fills the slot area behind the shape. A slot can be left empty; empty is a valid patch.
3. **Pattern:** the tile repeated in rows and columns, optionally offset by half a tile, optionally varied per copy (see Variation).
4. **Palette:** five colours shared by the whole pattern. Background, patches and shapes each point at one of the five.
5. **Output:** the pattern framed at a layout's size, with density set as tiles across the frame. Chosen in the Save view.

Rules that hold everywhere:

- The tile the user edits is the **master**. It is always shown upright and untransformed, even when copies are turned, mirrored or left out.
- Every copy is derived from the master. There are no per-copy edits.
- Seams are always perfect. Shapes stay inside their slots, so nothing crosses a tile edge by accident.
- Tile size on screen stays constant when the template changes, so more slots means smaller shapes. The canvas never jumps in scale. Density is only set against the output (see Views and output).

## Tile templates

Seven templates, ordered by complexity. Show them as small thumbnails of their slot outlines, with no names: the outlines say it.

| Template | Slots | Layout |
| --- | --- | --- |
| Whole cloth | 1 | One slot filling the tile |
| Two, stacked | 2 | Top and bottom halves |
| Two, side by side | 2 | Left and right halves |
| Half-square triangle | 2 | Split along one diagonal |
| Four-patch | 4 | 2 × 2 grid |
| Quarter-square triangle | 4 | Split along both diagonals into four triangles |
| Nine-patch | 9 | 3 × 3 grid |

- **Triangle slots** fit each shape on its own: as big as it can be inside the triangle at 100%, placed where it touches all three edges. A shape with a flat side has three turns there, one per edge, resting its flat side on the long edge first, so the arch faces out from the tile centre by default. This gives pinwheels and rosettes for free.
- **Switching templates** shows the same shapes in a different arrangement. A design holds one ordered list of nine fills and each template shows as many as it has slots, always from the start: Whole cloth shows the first, the two-slot templates the first two, and so on. Shape, turn, colour and patch all carry across, and a change made in one template shows in all of them. Fills a template isn't showing are kept and left alone.
- **Slot order** keeps shapes in place as templates grow: grids fill outwards from the top left, so a nine-patch starts with a four-patch's arrangement, and opposite triangles in the quarter-square hold what a four-patch has on its diagonals.
- Switching clears the current selection.

## Shapes

The tool knows each of the ten motifs and only offers what changes something for that shape. All are single-colour SVGs on a 24 × 24 grid using `currentColor`, so colour is applied from the palette.

| Shape | Distinct turns (90° steps) | Optical size | Notes |
| --- | --- | --- | --- |
| Dot | 1 | × 1.25 | Drawn small in the source; scale up so it holds its own |
| Ring | 1 | × 1.0 | Only outline shape; reads lighter |
| Square | 1 | × 0.95 | Same shape as diamond turned 45° |
| Diamond | 1 | × 0.95 |  |
| Cross | 1 | × 1.0 |  |
| Star | 1 | × 1.0 | Sits naturally in the gaps between dots or rings |
| Leaf | 2 | × 1.0 | Upright or lying down |
| Triangle | 4 | × 1.0 | Directional |
| Chevron | 4 | × 1.0 | Directional; nests into itself as stripes |
| Arch | 4 | × 1.0 | Directional; facing pairs make circles, offset rows make scales |

- **Turn** is only offered for shapes with more than one distinct turn. Each tap or press of R advances one step and cycles.
- **Optical size** is a starting point to tune by eye so mixed shapes look equally weighted. Keep it as data per shape, not hard-coded at call sites.
- Shapes are centred in their slot and sized to a fraction of the slot set by the Shape size control.

## Placing shapes

Shapes are dragged from the tray onto the tile. Where the shape is released decides what happens, and the user sees the result before letting go. Editing happens only in the Tile view.

**Drop targets**

| Released on | Result | Cursor label |
| --- | --- | --- |
| A slot | That slot gets the shape | Into this slot |
| The tile edge (a band about 8% of the tile wide, inside the border) | Every slot gets the shape | Fill every slot |
| Anywhere off the pattern | Nothing; the drag is cancelled | none |

**Ghost preview**

- While hovering a target, render the whole pattern as if the drop had happened, so the user sees the repeat change live.
- Outline the target on the master tile: the slot for a shape, or all slots plus a heavy tile border for an edge drop. A colour dropped on a shape or on the slot around it is not outlined: the preview fills it.
- A small label next to the cursor names what will happen.
- While a drag is in progress, the fade on the copies lightens so the effect across the pattern is visible.

**Default colour for a new shape**

- If the same shape is already in the tile, reuse its colour, so one shape reads as one colour by default.
- Otherwise, if the slot already held a shape, keep that slot's colour.
- Otherwise, use the least-used ink, never the background colour.

**Selecting and adjusting a slot**

- A slot is one thing to select: its shape and the patch around it together. Clicking anywhere in a slot, on the shape, around it or in an empty one, selects it with one outline around the whole slot. The shape is never outlined on its own, so turning it leaves the outline still. Clicking it again, clicking away or pressing Esc deselects.
- Clicking a colour then colours the slot's shape, or its patch if the slot is empty. The background chip beside the colours becomes that slot's background: it shows the patch's colour (the background's if it has none), and clicking it asks for one colour for the patch. The next colour clicked sets the patch, and then the slot is selected as before. Clicking the chip again lets go of it. Choosing the background's colour clears the patch. With nothing selected the chip selects the whole pattern's background the same way.
- With a slot selected, Turn (only for shapes with more than one distinct turn) and Remove appear at the far right of the bar.
- Keyboard: R turns, Delete or Backspace removes the shape (or the patch, in an empty slot), Esc deselects.
- With a slot selected, clicking a shape in the row puts it in that slot. This is the keyboard- and touch-friendly path; without a selection, clicking a shape shows a short hint to drag it.

## Shift

Alternate rows or alternate columns of tiles can shift by half a tile, never both at once. It is one setting with three states: None, Rows, Columns.

- **Rows** shifts every other row sideways by half a tile (brick). **Columns** shifts every other column down by half a tile (half-drop). Using both would make tiles collide, which is why it is one setting.
- The shift applies to whole tiles, never to the slot rows inside a tile. On a nine-patch, shifting slot rows would break the seam at every tile boundary.
- **Control:** a three-way segmented control labelled None / Rows / Columns.
- **No direct manipulation.** Dragging on the pattern does nothing; the control is the only way to shift.
- A click on the pattern selects a slot (see Placing shapes).

## Colour

A pattern has exactly five colours, and every coloured thing points at one of them. Changing a colour changes everything that uses it, so trying a new look is one action, never recolouring shape by shape.

**Roles.** Three layers, each pointing at one of the five colours:

- **Background** (the backing): one colour for the whole pattern. Defaults to colour 1.
- **Patch** (per slot): the fabric behind a shape, filling the slot area. Defaults to none, so the background shows.
- **Shape** (per slot): the shape's own colour.

**Palettes.**

- A small set of preset moods, each a full set of five colours. Choosing a mood swaps the five values and keeps every role assignment, so the pattern recolours in place.
- Any of the five can be edited with a colour picker, which also shows the colour as hex and takes one typed or pasted. Editing marks the palette as custom.
- Five is fixed: not more as templates get bigger. Colour count is about harmony and slot count is about structure; tying them together leads to muddy patterns.
- Moods are plain data, so they are easy to replace.

**Colour drop grammar.** Colours are assigned with the same drag-and-drop as shapes, with the same ghost preview and cursor label:

| Swatch released on | Sets |
| --- | --- |
| A shape | That shape's colour |
| The slot area around a shape | That slot's patch colour |
| The master tile's edge band | Every shape's colour |
| The background chip | The background, or the selected slot's patch if a slot is selected |

With nothing selected, clicking a colour (no drag) opens its colour picker. The Moods button opens the moods at any time.

**Guard:** when the tool picks a colour by default, it never gives a shape the same colour as its patch or the background, because the shape would disappear. The user can still do this deliberately by colouring a shape.

**Changing the background** never hides anything. A bare shape or a patch that already has the new colour trades it for the old background's colour, along with the rest of its slot.

## Variation

Variation changes copies of the tile across the pattern, never the master. Every variation is either a predictable rule or seeded randomness, and the pattern always stays seamless. This set is provisional and is expected to shrink after looking at it.

**Turn tiles** (one choice at a time). Each copy turns or mirrors as a whole, so the arrangement of slots turns with it. This is different from turning a shape in place, and it is what makes quilt pinwheels.

| Option | Rule (copy at column i, row j) |
| --- | --- |
| None | No change |
| Pinwheel | Each 2 × 2 group turns 0°, 90°, 180°, 270° around its centre |
| Mirror | Odd columns mirror left to right, odd rows mirror top to bottom |
| Random | Each copy takes a random turn, seeded |

**Other variations**

- **Alternate colours:** on checkerboard copies, inks swap in pairs (2 ↔ 3, 4 ↔ 5). Same five colours, more complex look.
- **Hide some tiles:** 3 of every 16 copies are removed, seeded, so the background shows through.
- **Angle pattern:** the whole pattern turns 45° in the Pattern view and in saved files, so the grid runs diagonally. The Tile view stays upright, and switching views swings the camera round. Only 45°: other angles look like mistakes.
- **Shuffle:** picks a new seed. Clicking Random again does it, and Hide some tiles has a dice beside its switch while it's on.

**Seamless randomness.** Random choices repeat over a 4 × 4 block of tiles rather than being truly random, so the pattern still tiles perfectly and the repeat-tile file stays valid.

**Hide what does nothing.** If an option would make no visible difference for the current tile, hide it. For example, a four-patch of dots looks identical under Pinwheel and Mirror, and a non-designer will read a control that does nothing as broken.

In the Tile view, the master is always shown as the user built it, even if Random or Hide some tiles would affect its position in the pattern.

## Views and output

There is one canvas with two zoom levels, Tile and Pattern. Moving between them is a camera move (an animated zoom), not a mode switch. Editing shapes and colours on the canvas happens only in Tile.

**Tile view (making the tile)**

- The master tile sits centred at a constant on-screen size, with the repeating pattern around it.
- The copies are faded (about 60% towards the background) so the master is in focus. The fade lightens while dragging.
- Shapes and colours change here, and only here.

**Pattern view (how it repeats)**

- The pattern fills the view, with no output frame and no fade. The same camera zooms out from the tile.
- The bar at the bottom holds Shift, Turn, Alternate colours and Hide some tiles.

**Moving between them.** Tapping Space switches views. Holding it hides the bars and shows the pattern with nothing in front of it, from either view.

**Save view.** Save opens a view of its own over the whole window, header included, where everything about the file is chosen. The design doesn't change here.

- **Preview:** large, beside the choices on wide screens and above them on narrow ones. It is the file itself at the size it's shown, and it changes shape between layouts with a spring. The size in pixels sits under it.
- **Layouts:** a grid of seven, each a small picture of the pattern already in that shape. Custom shows width and height fields in pixels, 64 to 8000 a side.
- **Tiles across** stepper, or for the repeat tile, a line saying what it is and how many tiles it holds.
- **Save PNG** and **Save SVG**, stacked full width, PNG filled and SVG outlined, for every layout. Once saved, the file name briefly takes the size's place under the preview, and the preview flashes. The panel is only as tall as what's in it.
- Esc or the close button goes back. Space does nothing here.

**Layouts**

| Layout | Size | Default tiles across |
| --- | --- | --- |
| Phone | 1179 × 2556 px | 4 |
| Tablet | 2048 × 2732 px | 5 |
| Desktop | 1920 × 1080 px | 8 |
| Square | 2048 × 2048 px | 4 |
| A4 print | 2480 × 3508 px (300 dpi) | 5 |
| Repeat tile | The repeat block (see below) | Not adjustable |
| Custom | Typed in, starts at 2000 × 1500 px | 6 |

- **Density** is set as tiles across the frame (1 to 16) with a stepper, whatever the template. Tile size = frame width ÷ tiles across.
- **Edges:** the pattern is centred on a tile at the frame's centre, so opposite edges cut the same way and the crop looks intentional.
- **Repeat tile** saves the smallest block that tiles seamlessly, which grows with settings: 1 × 1 by default; 1 × 2 with Rows shifted; 2 × 1 with Columns shifted; at least 2 × 2 with Pinwheel, Mirror or Alternate colours; 4 × 4 with Random or Hide some tiles. Angled, it is a square √2 times the longer side of that block, centred on the master. The file name says which block size it is, and whether it is angled.

## Interface layout

The canvas in a rounded frame, with no side panels, so the tile and pattern are the hero. Every control floats over it: the header in every view, and each view's own controls only in that view.

- **Header:** one bar floating at the top centre of the canvas: undo and redo · a Tile / Pattern segmented control · Copy link, which copies a link that opens this design · Save, which opens the Save view.
- **Bar below the tile:** Tile (shows the current template) · Shapes · Moods | the five colours and the background chip | Turn and Remove while a slot with a shape is selected, split by dividers. Tile, Shapes, Moods and a colour each unfold in the bar, downwards so the tile stays uncovered: templates; the ten draggable shapes and Shape size; moods; that colour's picker. Shapes are unfolded on load and stay out while something is selected. The bar keeps one corner radius throughout, and what's inside it is concentric with that radius.
- **Bar at the bottom of the Pattern view:** Shift | Turn | Alternate colours | Hide some tiles, with options a tile can't show left out.
- **Canvas:** one small hint at a time, dark with light text so it stands out, next to what it's about: centred above the tile in the Tile view, above the bar in the Pattern view, and centred under the header for saving (see First visit). With nothing left to suggest, it only appears for a moment, such as to name a saved file.
- **Tooltips:** only where an icon or chip doesn't say what it does, using the interface's own tooltip rather than the browser's: "Rotate (R)", "Remove shape", "Click to change background", or "Click to change this slot's background" with a slot selected (neither once it's selected), "Pick a different palette" on Moods, undo and redo, Copy link, the tiles across stepper, Save SVG and Shuffle. Closing the Save view has none: an X says it. The colours, shapes, templates and moods have none: what they look like is enough.
- **Narrow screens:** still to be designed. Tile, Shapes and Moods drop their labels and the bars wrap for now. Dragging works with touch.

## First visit

Every tool is there and usable from the start. Nothing is revealed bit by bit, and there's no tour.

- **Intro:** on every load, saved design or not, the page opens on the whole pattern with nothing in front of it and nothing to touch. The camera then flies into the tile, the header and bar arrive, and the shapes unfold last. With reduced motion it goes straight to the tile.
- **Starting pattern:** one of a few hand-picked finished patterns, chosen at random, so the first look is a good one. Someone who only looked gets the intro and another pattern next time; anyone who changed something comes back to their own work.
- **Hints are invitations, not steps.** Each one goes once it's been done, in any order, and what's been done is kept across visits:

| Hint | Shows |
| --- | --- |
| Drag in a shape, or try a different layout from Tile. | Until a shape or the layout changes |
| Pick a colour to paint it, or try out different palettes from Moods. | Until any colour changes. It comes first while something is selected |
| Tap Space or use the buttons above to see the whole pattern. Or hold Space to preview it. (Only the buttons on touch) | Once both of the above are done, or after a few changes of any kind, until the Pattern view is visited |
| Play around with the options below to change how the pattern repeats. | In the Pattern view, until anything about the repeat changes |
| Press Save to download your pattern when you're done. | Under the Save button, in either view, once the repeat has changed. It goes when Save is opened (saved or not), or after a few more changes |

- **Resting on the tile:** after a short pause on a slot, the label by the pointer says "Click to select this slot". It stops once one has been clicked.

Copy is written for someone with no pattern vocabulary: "Rows", "Fill every slot", "Hide some tiles", never "brick", "half-drop" or "lattice". Quilt block names stay in the code and screen readers, not on screen.

## Cut from scope

These were tried or considered and deliberately left out. Do not add them back without asking.

| Cut | Why |
| --- | --- |
| Sixteen-patch template | Past the point of diminishing returns; nine slots already give plenty of variety |
| Corner slots shared between tiles | Added a concept without paying for it |
| Editing on the canvas in the Pattern view | Felt finicky; editing belongs at tile zoom |
| Per-shape size, stroke, opacity | Not worth a control for this audience |
| More than five colours, or palettes that grow with the template | Leads to muddy patterns |
| Shapes crossing tile edges | Guarantees perfect seams |
| A separate tile editor screen | One canvas with two zoom levels instead |
| Free placement and natural or fractal patterns | Geometric, textile-style patterns fit the given shapes |

## Open questions

These are settled by looking at the built thing. Build them as easy-to-change values, not buried constants.

- [ ] Which variation options survive, and whether hiding no-op options is enough or the set should simply be smaller.
- [ ] Colour moods: names and values.
- [ ] Optical size factor per shape, tuned by eye.
- [ ] The Shape size range (30% to 100%).
- [ ] How strong the fade on copies is in the Tile view, and how much it lightens during a drag.
- [ ] Width of the tile-edge drop band: wide enough to hit, narrow enough not to steal slot drops.
- [x] The pattern shown on first load: one of the hand-picked starters, at random (see First visit). Which ones make the list is still by eye.
- [x] Undo and redo: built, with buttons as well as shortcuts, covering everything the person made.
- [x] Whether the work persists on reload: it does. Only the design is saved.
- [x] Keeping and sharing patterns: a link that carries the design. Copy link sits by Save.
