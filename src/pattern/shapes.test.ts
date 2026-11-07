import { describe, expect, it } from 'vitest'
import manifest from '../../data/motifs.json'
import { tuningConfig } from '../tuning/config'
import { fitToSlot, SHAPES } from './shapes'

describe('shapes', () => {
  it('covers every shape in the data folder, in the same order', () => {
    expect(SHAPES.map((m) => m.id)).toEqual(manifest.motifs.map((m) => m.id))
  })

  it('extracts drawable SVG for every shape', () => {
    for (const shape of SHAPES) expect(shape.body).toMatch(/^<(path|circle|rect)/)
  })

  it('has an outline that reaches exactly as far as the art does', () => {
    for (const { art, outline } of SHAPES) {
      const xs = outline.map(([x]) => x)
      const ys = outline.map(([, y]) => y)
      expect(Math.min(...xs)).toBeCloseTo(art.x, 1)
      expect(Math.max(...xs)).toBeCloseTo(art.x + art.width, 1)
      expect(Math.min(...ys)).toBeCloseTo(art.y, 1)
      expect(Math.max(...ys)).toBeCloseTo(art.y + art.height, 1)
    }
  })

  it('has an optical size dial for every shape', () => {
    expect(Object.keys(tuningConfig.optical).sort()).toEqual(SHAPES.map((m) => m.id).sort())
  })

  it('fills the slot at 100% whatever the optical size', () => {
    for (const optical of [0.3, 0.55, 1, 1.2]) expect(fitToSlot(1, optical)).toBeCloseTo(1)
  })

  it('applies optical size below 100%, and grows steadily with the slider', () => {
    expect(fitToSlot(0.6, 0.55)).toBeLessThan(fitToSlot(0.6, 1))
    expect(fitToSlot(0.6, 1)).toBeCloseTo(0.6)
    expect(fitToSlot(0.8, 0.55)).toBeGreaterThan(fitToSlot(0.6, 0.55))
  })
})
