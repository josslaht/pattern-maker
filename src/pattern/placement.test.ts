import { describe, expect, it } from 'vitest'
import { rotateShape } from './drops'
import type { Design } from './model'
import { FIRST_LOAD } from './samples'
import { SHAPE_BY_ID, SHAPES } from './shapes'
import { placeInSlot, rotationsIn } from './placement'
import { TEMPLATE_BY_ID, type Point, type Slot } from './templates'

const TRIANGLES = [...TEMPLATE_BY_ID.halfSquare.slots, ...TEMPLATE_BY_ID.quarterSquare.slots]
const SQUARE_SLOT = TEMPLATE_BY_ID.fourPatch.slots[0]

/** A shape's outline where it is drawn: turned and scaled about its fit box centre, then moved. */
const placedOutline = (
  slot: Slot,
  id: (typeof SHAPES)[number]['id'],
  rotation: number,
): Point[] => {
  const { box, outline } = SHAPE_BY_ID[id]
  const { cx, cy, size, degrees } = placeInSlot(slot, id, rotation)
  const [sin, cos] = [Math.sin((degrees * Math.PI) / 180), Math.cos((degrees * Math.PI) / 180)]
  const scale = size / box.side
  return outline.map(([x, y]) => {
    const [dx, dy] = [x - box.x - box.side / 2, y - box.y - box.side / 2]
    return [cx + scale * (dx * cos - dy * sin), cy + scale * (dx * sin + dy * cos)]
  })
}

/** How far a point is inside an edge of a slot. Negative means outside. */
const insideEdge = (poly: Point[], k: number, [x, y]: Point) => {
  const [ax, ay] = poly[k]
  const [bx, by] = poly[(k + 1) % poly.length]
  return ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / Math.hypot(bx - ax, by - ay)
}

const cases = TRIANGLES.flatMap((slot) =>
  SHAPES.flatMap(({ id }) =>
    Array.from({ length: rotationsIn(slot, id) }, (_, rotation) => ({ slot, id, rotation })),
  ),
)

describe('shapes in a triangle slot', () => {
  it.each(cases)(
    'keeps $id rotation $rotation inside, touching all three edges',
    ({ slot, id, rotation }) => {
      const points = placedOutline(slot, id, rotation)
      for (let k = 0; k < 3; k++) {
        const clearances = points.map((point) => insideEdge(slot.poly, k, point))
        // The leaf and arch are made of many short sides, which only touch to within a hair.
        expect(Math.min(...clearances)).toBeGreaterThan(-0.002)
        expect(Math.min(...clearances)).toBeLessThan(0.002)
      }
    },
  )

  it('puts a dot where the circle that touches all three edges is', () => {
    for (const slot of TRIANGLES) {
      const { cx, cy, size } = placeInSlot(slot, 'dot', 0)
      expect(cx).toBeCloseTo(slot.cx)
      expect(cy).toBeCloseTo(slot.cy)
      expect(size).toBeCloseTo(slot.size, 2)
    }
  })

  it('lays a diamond flat against the long edge instead of in a corner', () => {
    const slot = TEMPLATE_BY_ID.halfSquare.slots[1]
    const points = placedOutline(slot, 'diamond', 0)
    // Slot 1's long edge is its third. A side of the diamond lies along it, so two corners touch.
    const touching = points.filter((point) => Math.abs(insideEdge(slot.poly, 2, point)) < 0.002)
    expect(touching).toHaveLength(2)
  })

  it.each(['triangle', 'arch', 'chevron'] as const)(
    'rests a %s flat on each edge in turn',
    (id) => {
      for (const slot of TRIANGLES) {
        const length = (k: number) => {
          const [ax, ay] = slot.poly[k]
          const [bx, by] = slot.poly[(k + 1) % 3]
          return Math.hypot(bx - ax, by - ay)
        }
        const longest = [0, 1, 2].reduce((best, k) => (length(k) > length(best) ? k : best), 0)
        const resting = [0, 1, 2].map((rotation) => {
          const points = placedOutline(slot, id, rotation)
          return [0, 1, 2].filter(
            (k) =>
              points.filter((point) => Math.abs(insideEdge(slot.poly, k, point)) < 0.002).length >=
              2,
          )
        })
        expect(resting[0]).toEqual([longest])
        // Each rotation rests on its own edge, so all three are used.
        expect(new Set(resting.flat()).size).toBe(3)
      }
    },
  )
})

describe('rotating in a triangle slot', () => {
  it('has three rotations for a shape with a side, and the one it has for one without', () => {
    const slot = TRIANGLES[0]
    expect(rotationsIn(slot, 'arch')).toBe(3)
    expect(rotationsIn(slot, 'leaf')).toBe(3)
    expect(rotationsIn(slot, 'dot')).toBe(1)
    expect(rotationsIn(SQUARE_SLOT, 'arch')).toBe(4)
    expect(rotationsIn(SQUARE_SLOT, 'leaf')).toBe(2)
  })

  it('goes round in three presses, whatever rotation it came from', () => {
    let design: Design = {
      ...FIRST_LOAD,
      template: 'halfSquare',
      fills: FIRST_LOAD.fills.map((fill) => ({ ...fill, shape: 'arch', rotation: 3 })),
    }
    const seen = []
    for (let press = 0; press < 4; press++) {
      design = rotateShape(design, 0)
      seen.push(design.fills[0].rotation)
    }
    expect(seen).toEqual([1, 2, 0, 1])
  })

  it('still rotates in quarters in a square slot', () => {
    expect(placeInSlot(SQUARE_SLOT, 'arch', 3).degrees).toBe(270)
  })
})
