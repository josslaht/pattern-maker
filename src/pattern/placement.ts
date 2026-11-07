import { SHAPE_BY_ID, type ShapeId } from './shapes'
import type { Point, Slot } from './templates'

/** At 100% shape size. `cx`, `cy` is where the fit box centre goes. */
export type Placement = { cx: number; cy: number; size: number; degrees: number }

/** A triangle slot has three edges to rest on. */
export const rotationsIn = (slot: Slot, shape: ShapeId) => {
  const { rotations } = SHAPE_BY_ID[shape]
  return slot.poly.length === 3 && rotations > 1 ? 3 : rotations
}

/** Long edge first. Each has its length, outward normal and distance from the origin. */
const edgesOf = (poly: Point[]) => {
  const edges = poly.map(([ax, ay], k) => {
    const [bx, by] = poly[(k + 1) % 3]
    const length = Math.hypot(bx - ax, by - ay)
    const [nx, ny] = [(by - ay) / length, (ax - bx) / length]
    return { length, nx, ny, offset: nx * ax + ny * ay }
  })
  const longest = edges.reduce((best, edge, k) => (edge.length > edges[best].length ? k : best), 0)
  return edges.map((_, k) => edges[(longest + k) % 3])
}

/**
 * Square slots centre the shape and turn it in quarters. Triangle slots rest the shape's flat side
 * on one edge per rotation, long edge first, and make it as big as fits: each edge, pushed in by
 * how far the shape reaches towards it, has to meet at one point.
 */
export const placeInSlot = (slot: Slot, id: ShapeId, rotation: number): Placement => {
  if (slot.poly.length !== 3)
    return { cx: slot.cx, cy: slot.cy, size: slot.size, degrees: rotation * 90 }

  const { box, outline, rest, rotations } = SHAPE_BY_ID[id]
  const edges = edgesOf(slot.poly)
  const facing = edges[rotation % 3]
  const degrees =
    rotations === 1 ? 0 : rest + (Math.atan2(facing.ny, facing.nx) * 180) / Math.PI - 90

  const [sin, cos] = [Math.sin((degrees * Math.PI) / 180), Math.cos((degrees * Math.PI) / 180)]
  const reaches = edges.map(({ nx, ny }) =>
    Math.max(
      ...outline.map(([x, y]) => {
        const [dx, dy] = [x - (box.x + box.side / 2), y - (box.y + box.side / 2)]
        return nx * (dx * cos - dy * sin) + ny * (dx * sin + dy * cos)
      }),
    ),
  )

  // Twice the triangle's area over the shape's reach round all three edges
  const scale =
    edges.reduce((sum, { length, offset }) => sum + length * offset, 0) /
    edges.reduce((sum, { length }, k) => sum + length * reaches[k], 0)

  // Touching the first two edges means it touches the third
  const [a, b] = edges
  const [ra, rb] = [a.offset - scale * reaches[0], b.offset - scale * reaches[1]]
  const across = a.nx * b.ny - a.ny * b.nx

  return {
    cx: (ra * b.ny - a.ny * rb) / across,
    cy: (a.nx * rb - b.nx * ra) / across,
    size: scale * box.side,
    degrees,
  }
}
