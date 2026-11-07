import { describe, expect, it } from 'vitest'
import {
  centredCamera,
  coverRange,
  outputName,
  outputSize,
  LAYOUTS,
  outputFrame,
  visibleRect,
  type LayoutId,
} from './camera'
import { dropShape, withFill } from './drops'
import { copyAt, repeatBlock, alternatedInks, tilePosition } from './layout'
import { fillsOf, type Design, type TileTurn } from './model'
import { FIRST_LOAD, SAMPLES } from './samples'
import { TEMPLATE_BY_ID, TEMPLATES, type Slot } from './templates'

const polygonArea = (poly: number[][]) =>
  Math.abs(
    poly.reduce((sum, [x, y], k) => {
      const [nextX, nextY] = poly[(k + 1) % poly.length]
      return sum + x * nextY - nextX * y
    }, 0),
  ) / 2

describe('templates', () => {
  it.each(TEMPLATES)('$name fills the tile exactly', (template) => {
    const area = template.slots.reduce((sum, slot) => sum + polygonArea(slot.poly), 0)
    expect(area).toBeCloseTo(1)
  })

  it('has the slot counts from the spec', () => {
    expect(TEMPLATES.map((t) => t.slots.length)).toEqual([1, 2, 2, 2, 4, 4, 9])
  })

  it.each(TEMPLATES)('$name fits a full-size circle in each slot, touching it', (template) => {
    for (const { poly, cx, cy, size } of template.slots) {
      // How far the slot's centre sits from each edge of the slot.
      const distances = poly.map(([ax, ay], k) => {
        const [bx, by] = poly[(k + 1) % poly.length]
        return ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) / Math.hypot(bx - ax, by - ay)
      })
      expect(Math.min(...distances)).toBeCloseTo(size / 2)
    }
  })

  it.each(['Half-square triangle', 'Quarter-square triangle'])(
    '%s touches all three edges with that circle',
    (name) => {
      for (const { poly, cx, cy, size } of TEMPLATES.find((t) => t.name === name)!.slots) {
        for (const [k, [ax, ay]] of poly.entries()) {
          const [bx, by] = poly[(k + 1) % poly.length]
          const distance =
            ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) / Math.hypot(bx - ax, by - ay)
          expect(distance).toBeCloseTo(size / 2)
        }
      }
    },
  )
})

describe('switching templates', () => {
  it.each(TEMPLATES)('$name shows the first shapes of the one list', (template) => {
    const fills = fillsOf({ ...FIRST_LOAD, template: template.id })
    expect(fills).toEqual(FIRST_LOAD.fills.slice(0, template.slots.length))
  })

  it('is long enough for the biggest template in every sample', () => {
    for (const design of Object.values(SAMPLES)) expect(design.fills).toHaveLength(9)
  })

  it('shows a change made in one template in all of them', () => {
    const whole: Design = { ...FIRST_LOAD, template: 'wholeCloth' }
    const changed = withFill(whole, 0, { shape: 'star', ink: 3 })
    for (const { id } of TEMPLATES) {
      const [first] = fillsOf({ ...changed, template: id })
      expect(first.shape).toBe('star')
      expect(first.ink).toBe(3)
    }
  })

  it('keeps shapes out of sight when going to a smaller template and back', () => {
    const nine: Design = { ...FIRST_LOAD, template: 'ninePatch' }
    const small = withFill({ ...nine, template: 'wholeCloth' }, 0, { shape: 'star' })
    expect(fillsOf({ ...small, template: 'ninePatch' }).slice(1)).toEqual(fillsOf(nine).slice(1))
  })

  it('never fills a slot of a template that is not showing', () => {
    const two: Design = { ...FIRST_LOAD, template: 'twoStacked' }
    const filled = dropShape(two, { kind: 'edge' }, 'star')
    expect(filled.fills.slice(0, 2).map((fill) => fill.shape)).toEqual(['star', 'star'])
    expect(filled.fills.slice(2)).toEqual(FIRST_LOAD.fills.slice(2))
  })

  it('keeps the first four shapes of a nine-patch in their four-patch places', () => {
    const place = ({ cx, cy }: Slot, across: number) => [
      Math.floor(cx * across),
      Math.floor(cy * across),
    ]
    const four = TEMPLATE_BY_ID.fourPatch.slots.map((slot) => place(slot, 2))
    const nine = TEMPLATE_BY_ID.ninePatch.slots.slice(0, 4).map((slot) => place(slot, 3))
    expect(nine).toEqual(four)
  })

  it('puts the diagonals of a four-patch opposite each other in the quarter-square', () => {
    const { slots } = TEMPLATE_BY_ID.quarterSquare
    const across = (a: number, b: number) => [slots[a].cx + slots[b].cx, slots[a].cy + slots[b].cy]
    expect(across(0, 3)).toEqual([1, 1])
    expect(across(1, 2)).toEqual([1, 1])
  })
})

describe('the repeat block', () => {
  const base = FIRST_LOAD
  const rows = { axis: 'rows', amount: 0.5 } as const
  const cols = { axis: 'cols', amount: 0.5 } as const

  it('matches the sizes in the spec', () => {
    expect(repeatBlock(base)).toEqual([1, 1])
    expect(repeatBlock({ ...base, shift: rows })).toEqual([1, 2])
    expect(repeatBlock({ ...base, shift: cols })).toEqual([2, 1])
    expect(repeatBlock({ ...base, turn: 'pinwheel' })).toEqual([2, 2])
    expect(repeatBlock({ ...base, turn: 'mirror' })).toEqual([2, 2])
    expect(repeatBlock({ ...base, alternateColours: true })).toEqual([2, 2])
    expect(repeatBlock({ ...base, turn: 'scatter' })).toEqual([4, 4])
    expect(repeatBlock({ ...base, gaps: true })).toEqual([4, 4])
  })

  // The promise behind "seams are always perfect": shifting by one block must change
  // nothing, for every combination of settings.
  const turns: TileTurn[] = ['none', 'pinwheel', 'mirror', 'scatter']
  const shifts = [{ axis: 'none', amount: 0 } as const, rows, cols]
  const flags = [false, true]

  it('really does repeat, for every combination of settings', () => {
    for (const turn of turns) {
      for (const shift of shifts) {
        for (const alternateColours of flags) {
          for (const gaps of flags) {
            const design = { ...base, turn, shift, alternateColours, gaps }
            const [across, down] = repeatBlock(design)
            for (let j = -5; j < 5; j++) {
              for (let i = -5; i < 5; i++) {
                expect(copyAt(design, i + across, j + down)).toEqual(copyAt(design, i, j))
                const [x, y] = tilePosition(shift, i, j)
                expect(tilePosition(shift, i + across, j + down)).toEqual([x + across, y + down])
              }
            }
          }
        }
      }
    }
  })
})

describe('tile copies', () => {
  it('never swaps a colour with the background', () => {
    for (let background = 0; background < 5; background++) {
      const inks = alternatedInks(background)
      expect(inks[background]).toBe(background)
      expect(new Set(inks).size).toBe(5)
      inks.forEach((ink, k) => {
        if (k !== background) expect(ink).not.toBe(background)
      })
    }
  })

  it('never moves the tile at the origin', () => {
    expect(tilePosition({ axis: 'rows', amount: 0.5 }, 0, 0)).toEqual([0, 0])
    expect(tilePosition({ axis: 'cols', amount: 0.5 }, 0, 0)).toEqual([0, 0])
  })
})

describe('the camera', () => {
  const viewport = { width: 1000, height: 800 }

  it('keeps tile size constant whatever the template', () => {
    expect(centredCamera(viewport, 0.3).scale).toBe(240)
  })

  it('centres the output frame on the master tile', () => {
    for (const layout of ['phone', 'desktop', 'a4'] as LayoutId[]) {
      const frame = outputFrame(FIRST_LOAD, layout, 5)
      expect(frame.x + frame.width / 2).toBeCloseTo(0.5)
      expect(frame.y + frame.height / 2).toBeCloseTo(0.5)
      const size = LAYOUTS[layout].size!
      expect(frame.width / frame.height).toBeCloseTo(size.width / size.height)
    }
  })

  it('makes the repeat tile frame exactly the repeat block', () => {
    const frame = outputFrame(SAMPLES.Pinwheel, 'tile', 4)
    expect(frame).toEqual({ x: 0, y: 0, width: 2, height: 2 })
  })

  it('saves each layout at its own size, and a repeat tile by its block', () => {
    expect(outputSize(FIRST_LOAD, 'phone')).toEqual({ width: 1179, height: 2556 })
    expect(outputSize(FIRST_LOAD, 'tile')).toEqual({ width: 512, height: 512 })
    expect(outputSize(SAMPLES.Pinwheel, 'tile')).toEqual({ width: 1024, height: 1024 })
    expect(outputSize(SAMPLES.Scales, 'tile')).toEqual({ width: 512, height: 1024 })
  })

  it('names the file after the layout, and a repeat tile after its block', () => {
    expect(outputName(FIRST_LOAD, 'phone', 'png')).toBe('pattern-phone-wallpaper.png')
    expect(outputName(FIRST_LOAD, 'desktop', 'png')).toBe('pattern-desktop-16-9.png')
    expect(outputName(SAMPLES.Pinwheel, 'tile', 'svg')).toBe('pattern-repeat-tile-2x2.svg')
  })

  it('keeps tile edges on whole pixels in a repeat tile', () => {
    for (const design of Object.values(SAMPLES)) {
      const { width, height } = outputSize(design, 'tile')
      const frame = outputFrame(design, 'tile', 1)
      expect(Number.isInteger(width / frame.width)).toBe(true)
      expect(Number.isInteger(height / frame.height)).toBe(true)
    }
  })

  it('draws enough tiles to cover what can be seen', () => {
    const stage = { x: 0, y: 0, ...viewport }
    const visible = visibleRect(viewport, stage, centredCamera(viewport, 0.25))
    const range = coverRange([visible], 0)
    expect(range.i0).toBeLessThanOrEqual(visible.x)
    expect(range.i1).toBeGreaterThanOrEqual(visible.x + visible.width)
    expect(range.j0).toBeLessThanOrEqual(visible.y)
    expect(range.j1).toBeGreaterThanOrEqual(visible.y + visible.height)
  })

  it('sees the whole window around a stage set into it, with the camera on the stage', () => {
    const screen = { width: 1000, height: 800 }
    const stage = { x: 100, y: 200, width: 400, height: 400 }
    const visible = visibleRect(screen, stage, { cx: 0.5, cy: 0.5, scale: 100 })
    expect(visible).toEqual({ x: -2.5, y: -3.5, width: 10, height: 8 })
  })
})
