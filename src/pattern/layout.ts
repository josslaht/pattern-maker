import type { Design, Shift } from './model'
import type { Point } from './templates'

const IDENTITY_INKS = [0, 1, 2, 3, 4]

/** Random choices repeat over this many tiles, so the pattern still tiles. */
export const RANDOM_BLOCK = 4

/** Tiles hidden per block. */
const LEFT_OUT = 3

export const mod = (a: number, n: number) => ((a % n) + n) % n

const hash = (seed: number, i: number, j: number, salt: number) => {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b)
  h ^= Math.imul(i + 0x632be5ab, 0xc2b2ae35)
  h ^= Math.imul(j + 0x165667b1, 0x27d4eb2f)
  h ^= Math.imul(salt + 0x3c6ef372, 0x85ebca6b)
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d)
  h ^= h >>> 12
  h = Math.imul(h, 0x297a2d39)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

// A fixed count, so a shuffle can never hide nothing
const isLeftOut = (shuffle: number, i: number, j: number) => {
  const own = hash(shuffle, i, j, 2)
  let lower = 0
  for (let y = 0; y < RANDOM_BLOCK; y++) {
    for (let x = 0; x < RANDOM_BLOCK; x++) {
      if (hash(shuffle, x, y, 2) < own) lower++
    }
  }
  return lower < LEFT_OUT
}

export const tilePosition = (shift: Shift, i: number, j: number): Point => {
  if (shift.axis === 'rows' && mod(j, 2)) return [i + shift.amount, j]
  if (shift.axis === 'cols' && mod(i, 2)) return [i, j + shift.amount]
  return [i, j]
}

/** Swaps colours in pairs, leaving out the background so shapes never vanish into it. */
export const alternatedInks = (background: number) => {
  const inks = [...IDENTITY_INKS]
  const others = IDENTITY_INKS.filter((ink) => ink !== background)
  for (let k = 0; k + 1 < others.length; k += 2) {
    inks[others[k]] = others[k + 1]
    inks[others[k + 1]] = others[k]
  }
  return inks
}

export type Copy = {
  /** Degrees around the tile's centre. */
  rotate: number
  flipX: boolean
  flipY: boolean
  /** The master's colour index → this copy's. */
  inks: number[]
  hidden: boolean
}

export const copyAt = (design: Design, i: number, j: number): Copy => {
  const oddI = mod(i, 2)
  const oddJ = mod(j, 2)
  const checker = oddI !== oddJ
  const randomI = mod(i, RANDOM_BLOCK)
  const randomJ = mod(j, RANDOM_BLOCK)

  let rotate = 0
  if (design.turn === 'pinwheel') {
    rotate = [
      [0, 90],
      [270, 180],
    ][oddJ][oddI]
  }
  if (design.turn === 'scatter') {
    rotate = Math.floor(hash(design.shuffle, randomI, randomJ, 1) * 4) * 90
  }

  const mirror = design.turn === 'mirror'

  return {
    rotate,
    flipX: mirror && oddI === 1,
    flipY: mirror && oddJ === 1,
    inks: design.alternateColours && checker ? alternatedInks(design.background) : IDENTITY_INKS,
    hidden: design.gaps && isLeftOut(design.shuffle, randomI, randomJ),
  }
}

export type Pose = { rotate: number; scaleX: number; scaleY: number }

export const poseOf = ({ rotate, flipX, flipY }: Copy): Pose => ({
  rotate,
  scaleX: flipX ? -1 : 1,
  scaleY: flipY ? -1 : 1,
})

export const poseTransform = ([x, y]: Point, { rotate, scaleX, scaleY }: Pose) =>
  `translate(${x + 0.5} ${y + 0.5}) rotate(${rotate}) scale(${scaleX} ${scaleY}) translate(-0.5 -0.5)`

export const copyTransform = (design: Design, i: number, j: number) =>
  poseTransform(tilePosition(design.shift, i, j), poseOf(copyAt(design, i, j)))

/** [across, down] */
export const repeatBlock = (design: Design): [number, number] => {
  if (design.turn === 'scatter' || design.gaps) return [RANDOM_BLOCK, RANDOM_BLOCK]
  if (design.turn !== 'none' || design.alternateColours) return [2, 2]
  if (design.shift.amount && design.shift.axis === 'rows') return [1, 2]
  if (design.shift.amount && design.shift.axis === 'cols') return [2, 1]
  return [1, 1]
}
