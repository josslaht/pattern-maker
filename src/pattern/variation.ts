import { isInside } from './drops'
import { copyAt, mod, RANDOM_BLOCK, type Copy } from './layout'
import { fillsOf, type Design, type TileTurn } from './model'
import { SHAPE_BY_ID } from './shapes'
import { placeInSlot } from './placement'
import { TEMPLATE_BY_ID, type Point } from './templates'

export const TILE_TURNS: { id: TileTurn; name: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'pinwheel', name: 'Pinwheel' },
  { id: 'mirror', name: 'Mirror' },
  { id: 'scatter', name: 'Random' },
]

/** A 6 × 6 grid, offset so no point lands on a slot edge or diagonal however the tile turns. */
const FABRIC_POINTS: Point[] = Array.from({ length: 36 }, (_, k) => [
  (k % 6) / 6 + 0.3 / 6,
  Math.floor(k / 6) / 6 + 0.6 / 6,
])

const turned = ([x, y]: Point, quarterTurns: number): Point => {
  const turns = mod(quarterTurns, 4)
  if (turns === 1) return [-y, x]
  if (turns === 2) return [-x, -y]
  if (turns === 3) return [y, -x]
  return [x, y]
}

const intoCopy = ([x, y]: Point, { rotate, flipX, flipY }: Copy): Point => {
  const [dx, dy] = turned([flipX ? 0.5 - x : x - 0.5, flipY ? 0.5 - y : y - 0.5], rotate / 90)
  return [dx + 0.5, dy + 0.5]
}

const fromCopy = ([x, y]: Point, { rotate, flipX, flipY }: Copy): Point => {
  const [dx, dy] = turned([x - 0.5, y - 0.5], -rotate / 90)
  return [(flipX ? -dx : dx) + 0.5, (flipY ? -dy : dy) + 0.5]
}

/** Degrees. Every shape is symmetric about its centre line, so a flip only changes the facing. */
const facing = (degrees: number, rotations: number, { rotate, flipX, flipY }: Copy) => {
  let faces = degrees
  if (flipX) faces = -faces
  if (flipY) faces = 180 - faces
  return mod(Math.round(faces + rotate), 90 * rotations)
}

const lookOfCopy = (design: Design, copy: Copy) => {
  const { slots } = TEMPLATE_BY_ID[design.template]
  const fills = copy.hidden ? [] : fillsOf(design)
  const colourOf = (ink: number) => design.colours[copy.inks[ink]].toLowerCase()
  const backing = design.colours[design.background].toLowerCase()

  const fabric = FABRIC_POINTS.map((point) => {
    const inMaster = fromCopy(point, copy)
    const patch = fills[slots.findIndex(({ poly }) => isInside(poly, inMaster))]?.patch
    return patch == null ? backing : colourOf(patch)
  })

  const shapes = slots.flatMap((slot, k) => {
    const fill = fills[k]
    if (!fill?.shape) return []
    const place = placeInSlot(slot, fill.shape, fill.rotation)
    const [x, y] = intoCopy([place.cx, place.cy], copy)
    const faces = facing(place.degrees, SHAPE_BY_ID[fill.shape].rotations, copy)
    return [
      [fill.shape, x.toFixed(3), y.toFixed(3), place.size.toFixed(3), faces, colourOf(fill.ink)],
    ].join(' ')
  })

  return `${fabric.join()}|${shapes.sort().join()}`
}

const lookOfPattern = (design: Design) => {
  const seen = new Map<string, string>()
  const looks = []
  for (let j = 0; j < RANDOM_BLOCK; j++) {
    for (let i = 0; i < RANDOM_BLOCK; i++) {
      const copy = copyAt(design, i, j)
      const key = JSON.stringify(copy)
      if (!seen.has(key)) seen.set(key, lookOfCopy(design, copy))
      looks.push(seen.get(key))
    }
  }
  return looks.join(';')
}

/** An option counts if it looks different from those before it. `shownTurn` matches the screen. */
export const usefulVariations = (design: Design) => {
  const plain = { ...design, alternateColours: false, gaps: false }

  const turnByLook = new Map<string, TileTurn>()
  for (const { id } of TILE_TURNS) {
    const look = lookOfPattern({ ...plain, turn: id })
    if (!turnByLook.has(look)) turnByLook.set(look, id)
  }
  const turns = [...turnByLook.values()]
  const shownTurn = turnByLook.get(lookOfPattern(plain)) ?? 'none'

  const alternateColours =
    lookOfPattern({ ...design, gaps: false, alternateColours: true }) !==
    lookOfPattern({ ...design, gaps: false, alternateColours: false })
  const gaps = lookOfPattern({ ...plain, gaps: true }) !== lookOfPattern(plain)

  return { turns, shownTurn, alternateColours, gaps }
}
