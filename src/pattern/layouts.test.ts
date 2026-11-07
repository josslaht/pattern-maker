import { describe, expect, it } from 'vitest'
import { outputName, outputSize, outputFrame } from './camera'
import { SAMPLES } from './samples'

const design = Object.values(SAMPLES)[0]

describe('custom layout', () => {
  const custom = { width: 1600, height: 400 }

  it('frames the pattern in the typed shape, centred on the master tile', () => {
    const frame = outputFrame(design, 'custom', 8, custom)
    expect(frame).toEqual({ x: -3.5, y: -0.5, width: 8, height: 2 })
  })

  it('saves at the typed size and says it in the name', () => {
    expect(outputSize(design, 'custom', custom)).toEqual(custom)
    expect(outputName(design, 'custom', 'png', custom)).toBe('pattern-custom-1600x400.png')
  })

  it('leaves the other layouts alone', () => {
    expect(outputSize(design, 'phone', custom)).toEqual({ width: 1179, height: 2556 })
    expect(outputName(design, 'phone', 'png', custom)).toBe('pattern-phone-wallpaper.png')
  })
})
