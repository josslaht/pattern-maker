export type Point = [x: number, y: number]

/** In tile units: the tile runs from (0,0) to (1,1). */
export type Slot = {
  poly: Point[]
  cx: number
  cy: number
  /** Diameter of the circle touching every edge. Triangle slots fit shapes in placement.ts. */
  size: number
}

export type TemplateId =
  | 'wholeCloth'
  | 'twoStacked'
  | 'twoSideBySide'
  | 'halfSquare'
  | 'fourPatch'
  | 'quarterSquare'
  | 'ninePatch'

export type Template = { id: TemplateId; name: string; slots: Slot[] }

/** Fills outwards from the top left, so a nine-patch starts with a four-patch in its corner. */
const grid = (id: TemplateId, name: string, cols: number, rows: number): Template => {
  const cells: { slot: Slot; ring: number }[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const [x0, x1] = [col / cols, (col + 1) / cols]
      const [y0, y1] = [row / rows, (row + 1) / rows]
      const slot: Slot = {
        poly: [
          [x0, y0],
          [x1, y0],
          [x1, y1],
          [x0, y1],
        ],
        cx: (x0 + x1) / 2,
        cy: (y0 + y1) / 2,
        size: Math.min(1 / cols, 1 / rows),
      }
      cells.push({ slot, ring: Math.max(row, col) })
    }
  }
  cells.sort((a, b) => a.ring - b.ring)
  return { id, name, slots: cells.map(({ slot }) => slot) }
}

/** Incircle radii: half of (leg + leg - hypotenuse). */
const HALF_SQUARE_R = 1 - Math.SQRT1_2
const QUARTER_SQUARE_R = (Math.SQRT2 - 1) / 2

const triangle = (poly: Point[], cx: number, cy: number, size: number): Slot => ({
  poly,
  cx,
  cy,
  size,
})

export const TEMPLATES: Template[] = [
  grid('wholeCloth', 'Whole cloth', 1, 1),
  grid('twoStacked', 'Two, stacked', 1, 2),
  grid('twoSideBySide', 'Two, side by side', 2, 1),
  {
    id: 'halfSquare',
    name: 'Half-square triangle',
    slots: [
      triangle(
        [
          [0, 0],
          [1, 0],
          [0, 1],
        ],
        HALF_SQUARE_R,
        HALF_SQUARE_R,
        HALF_SQUARE_R * 2,
      ),
      triangle(
        [
          [1, 0],
          [1, 1],
          [0, 1],
        ],
        1 - HALF_SQUARE_R,
        1 - HALF_SQUARE_R,
        HALF_SQUARE_R * 2,
      ),
    ],
  },
  grid('fourPatch', 'Four-patch', 2, 2),
  {
    id: 'quarterSquare',
    name: 'Quarter-square triangle',
    // Top, right, left, bottom, so opposite slots match a four-patch's diagonals
    slots: [
      triangle(
        [
          [0, 0],
          [1, 0],
          [0.5, 0.5],
        ],
        0.5,
        QUARTER_SQUARE_R,
        QUARTER_SQUARE_R * 2,
      ),
      triangle(
        [
          [1, 0],
          [1, 1],
          [0.5, 0.5],
        ],
        1 - QUARTER_SQUARE_R,
        0.5,
        QUARTER_SQUARE_R * 2,
      ),
      triangle(
        [
          [0, 1],
          [0, 0],
          [0.5, 0.5],
        ],
        QUARTER_SQUARE_R,
        0.5,
        QUARTER_SQUARE_R * 2,
      ),
      triangle(
        [
          [1, 1],
          [0, 1],
          [0.5, 0.5],
        ],
        0.5,
        1 - QUARTER_SQUARE_R,
        QUARTER_SQUARE_R * 2,
      ),
    ],
  },
  grid('ninePatch', 'Nine-patch', 3, 3),
]

export const MOST_SLOTS = Math.max(...TEMPLATES.map(({ slots }) => slots.length))

export const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t])) as Record<
  TemplateId,
  Template
>
