const sources = import.meta.glob<string>('/data/motifs/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const bodyOf = (svg: string) => svg.match(/<svg[^>]*>(.*)<\/svg>/s)?.[1].trim() ?? ''

const svgFor = (id: string) => {
  const svg = sources[`/data/motifs/${id}.svg`]
  if (!svg) throw new Error(`Missing shape file: ${id}.svg`)
  return bodyOf(svg)
}

export type ShapeId =
  | 'dot'
  | 'ring'
  | 'square'
  | 'diamond'
  | 'triangle'
  | 'chevron'
  | 'cross'
  | 'leaf'
  | 'star'
  | 'arch'

export type FitBox = { x: number; y: number; side: number }

export type ArtBounds = { x: number; y: number; width: number; height: number }

type GridPoint = [x: number, y: number]

/** Every 15°, which includes the 45° the triangle slots face. */
const arc = (cx: number, cy: number, r: number, from: number, to: number): GridPoint[] =>
  Array.from({ length: (to - from) / 15 + 1 }, (_, k) => {
    const angle = ((from + k * 15) * Math.PI) / 180
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  })

/** One side tip to tip, then the other side mirrored. */
const leafSide = (): GridPoint[] =>
  Array.from({ length: 9 }, (_, k) => {
    const t = k / 8
    const u = 1 - t
    return [
      12 * (u ** 3 + t ** 3) + 18.5 * 3 * t * u * (u + t),
      2.5 * u ** 3 + 7 * 3 * u * u * t + 17 * 3 * u * t * t + 21.5 * t ** 3,
    ]
  })

/**
 * `rotations`: how many 90° steps look different.
 * `box`: the part of the 24 × 24 grid that fills a slot at 100%, since the art's padding is uneven.
 * `art`: where the drawing is, to tell shape from patch.
 * `outline`: the outer corners, used to fit the shape into a triangle slot.
 * `rest`: degrees to turn the flattest side to the bottom.
 */
const define = (
  id: ShapeId,
  name: string,
  rotations: 1 | 2 | 4,
  box: FitBox,
  art: ArtBounds,
  outline: GridPoint[],
  rest = 0,
) => ({
  id,
  name,
  rotations,
  box,
  art,
  outline,
  rest,
  body: svgFor(id),
})

export const SHAPES = [
  define(
    'dot',
    'Dot',
    1,
    { x: 6, y: 6, side: 12 },
    { x: 6, y: 6, width: 12, height: 12 },
    arc(12, 12, 6, 0, 360),
  ),
  define(
    'ring',
    'Ring',
    1,
    { x: 3, y: 3, side: 18 },
    { x: 3, y: 3, width: 18, height: 18 },
    arc(12, 12, 9, 0, 360),
  ),
  define('square', 'Square', 1, { x: 5, y: 5, side: 14 }, { x: 5, y: 5, width: 14, height: 14 }, [
    [5, 5],
    [19, 5],
    [19, 19],
    [5, 19],
  ]),
  define(
    'diamond',
    'Diamond',
    1,
    { x: 2.5, y: 2.5, side: 19 },
    { x: 2.5, y: 2.5, width: 19, height: 19 },
    [
      [12, 2.5],
      [21.5, 12],
      [12, 21.5],
      [2.5, 12],
    ],
  ),
  // Sits on its flat side, so a facing pair meets
  define(
    'triangle',
    'Triangle',
    4,
    { x: 2.5, y: 1.5, side: 19 },
    { x: 2.5, y: 3.5, width: 19, height: 17 },
    [
      [12, 3.5],
      [21.5, 20.5],
      [2.5, 20.5],
    ],
  ),
  // The flat side is the two tips of the V
  define(
    'chevron',
    'Chevron',
    4,
    { x: 3, y: 5.25, side: 18 },
    { x: 3, y: 8.5, width: 18, height: 11.5 },
    [
      [3, 8.5],
      [21, 8.5],
      [21, 13.5],
      [12, 20],
      [3, 13.5],
    ],
    180,
  ),
  define(
    'cross',
    'Cross',
    1,
    { x: 2.5, y: 2.5, side: 19 },
    { x: 2.5, y: 2.5, width: 19, height: 19 },
    [
      [10, 2.5],
      [14, 2.5],
      [21.5, 10],
      [21.5, 14],
      [14, 21.5],
      [10, 21.5],
      [2.5, 14],
      [2.5, 10],
    ],
  ),
  define(
    'leaf',
    'Leaf',
    2,
    { x: 2.5, y: 2.5, side: 19 },
    { x: 7.13, y: 2.5, width: 9.74, height: 19 },
    [...leafSide(), ...leafSide().map(([x, y]): GridPoint => [24 - x, y])],
    90,
  ),
  define(
    'star',
    'Star',
    1,
    { x: 2.2, y: 2, side: 19.6 },
    { x: 2.2, y: 2, width: 19.6, height: 19.6 },
    [
      [12, 2],
      [21.8, 11.8],
      [12, 21.6],
      [2.2, 11.8],
    ],
  ),
  define(
    'arch',
    'Arch',
    4,
    { x: 3, y: 2.5, side: 18 },
    { x: 3, y: 11.5, width: 18, height: 9 },
    arc(12, 20.5, 9, 180, 360),
  ),
]

/** Optical size fades out towards 100%, where every shape touches. */
export const fitToSlot = (shapeSize: number, optical: number) =>
  shapeSize * (optical + (1 - optical) * shapeSize)

export type Shape = (typeof SHAPES)[number]

export const SHAPE_BY_ID = Object.fromEntries(SHAPES.map((m) => [m.id, m])) as Record<
  ShapeId,
  Shape
>
