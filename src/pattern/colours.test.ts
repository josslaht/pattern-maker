import { describe, expect, it } from 'vitest'
import {
  applyDrop,
  colourTargetAt,
  dropColour,
  dropLabel,
  hexToHsv,
  hsvToHex,
  inkOf,
  moodOf,
  parseHex,
  selectionAt,
  slotOf,
  slotsOf,
  targetOf,
  withColour,
} from './colours'
import { withFill } from './drops'
import { fillsOf, type Design } from './model'
import { MOODS } from './moods'
import { SHAPES, type ShapeId } from './shapes'
import { FIRST_LOAD, SAMPLES } from './samples'

const optical = Object.fromEntries(SHAPES.map((m) => [m.id, 1])) as Record<ShapeId, number>
const reach = { optical, shapeZone: 0.8, edgeBand: 0.085 }

const archTile = (rotation: number, shapeSize = 1): Design => ({
  ...SAMPLES.Scales,
  shapeSize,
  fills: [{ shape: 'arch', rotation, ink: 1, patch: null }],
})

describe('aiming a colour', () => {
  it('tells a shape from the patch around it', () => {
    const design: Design = { ...FIRST_LOAD, shapeSize: 0.5 }
    // Dot in the top right slot, centred at (0.75, 0.25).
    expect(colourTargetAt(design, [0.75, 0.25], reach)).toEqual({ kind: 'shape', slot: 1 })
    expect(colourTargetAt(design, [0.56, 0.12], reach)).toEqual({ kind: 'patch', slot: 1 })
  })

  it('finds the edge of the tile', () => {
    expect(colourTargetAt(FIRST_LOAD, [0.03, 0.5], reach)).toEqual({ kind: 'edge' })
  })

  it('ignores the copies', () => {
    expect(colourTargetAt(FIRST_LOAD, [1.25, 0.25], reach)).toBeNull()
  })

  it('treats an empty slot as all patch', () => {
    const design: Design = {
      ...FIRST_LOAD,
      fills: FIRST_LOAD.fills.map((fill) => ({ ...fill, shape: null })),
    }
    expect(colourTargetAt(design, [0.25, 0.25], reach)).toEqual({ kind: 'patch', slot: 0 })
  })

  it('knows which half of the slot an arch fills, however it is rotated', () => {
    expect(colourTargetAt(archTile(0), [0.5, 0.7], reach)?.kind).toBe('shape')
    expect(colourTargetAt(archTile(0), [0.5, 0.3], reach)?.kind).toBe('patch')
    expect(colourTargetAt(archTile(2), [0.5, 0.3], reach)?.kind).toBe('shape')
    expect(colourTargetAt(archTile(2), [0.5, 0.7], reach)?.kind).toBe('patch')
    expect(colourTargetAt(archTile(1), [0.3, 0.5], reach)?.kind).toBe('shape')
    expect(colourTargetAt(archTile(1), [0.7, 0.5], reach)?.kind).toBe('patch')
  })

  it('keeps the patch reachable around a full-size shape', () => {
    const square: Design = {
      ...FIRST_LOAD,
      shapeSize: 1,
      fills: FIRST_LOAD.fills.map((fill) => ({ ...fill, shape: 'square' })),
    }
    expect(colourTargetAt(square, [0.25, 0.25], reach)?.kind).toBe('shape')
    expect(colourTargetAt(square, [0.25, 0.48], reach)?.kind).toBe('patch')
  })
})

describe('selecting by clicking', () => {
  const design: Design = { ...FIRST_LOAD, shapeSize: 0.5 }

  it('selects the slot, whether the shape or the area around it was clicked', () => {
    expect(selectionAt(design, [0.75, 0.25])).toEqual({ kind: 'slot', slot: 1 })
    expect(selectionAt(design, [0.56, 0.12])).toEqual({ kind: 'slot', slot: 1 })
    expect(selectionAt(design, [0.02, 0.25])).toEqual({ kind: 'slot', slot: 0 })
  })

  it('selects nothing on the copies', () => {
    expect(selectionAt(design, [1.25, 0.25])).toBeNull()
  })

  it('knows which slot a selection is in', () => {
    expect(slotOf({ kind: 'slot', slot: 2 })).toBe(2)
    expect(slotOf({ kind: 'slotBackground', slot: 1 })).toBe(1)
    expect(slotOf({ kind: 'background' })).toBeNull()
    expect(slotOf(null)).toBeNull()
  })

  it('sends a clicked colour to the shape, or the patch if there is no shape or it was asked for', () => {
    const empty = withFill(FIRST_LOAD, 0, { shape: null })
    expect(targetOf(FIRST_LOAD, { kind: 'slot', slot: 0 })).toEqual({ kind: 'shape', slot: 0 })
    expect(targetOf(empty, { kind: 'slot', slot: 0 })).toEqual({ kind: 'patch', slot: 0 })
    expect(targetOf(FIRST_LOAD, { kind: 'slotBackground', slot: 0 })).toEqual({
      kind: 'patch',
      slot: 0,
    })
    expect(targetOf(FIRST_LOAD, { kind: 'background' })).toEqual({ kind: 'background' })
  })

  it('reads the colour of what is selected', () => {
    const [fill] = fillsOf(design)
    expect(inkOf(design, { kind: 'slot', slot: 0 })).toBe(fill.ink)
    expect(inkOf(design, { kind: 'background' })).toBe(design.background)
  })

  it('reads a slot background as its own colour, or the background if it has none', () => {
    const empty = withFill(FIRST_LOAD, 0, { patch: null })
    expect(inkOf(empty, { kind: 'slotBackground', slot: 0 })).toBe(FIRST_LOAD.background)
    const patched = withFill(FIRST_LOAD, 0, { patch: 3 })
    expect(inkOf(patched, { kind: 'slotBackground', slot: 0 })).toBe(3)
  })

  it('reads an empty slot as its patch', () => {
    const patched = withFill(withFill(FIRST_LOAD, 0, { shape: null }), 0, { patch: 3 })
    expect(inkOf(patched, { kind: 'slot', slot: 0 })).toBe(3)
  })
})

describe('dropping a colour', () => {
  it('sets the shape, or the patch, of one slot', () => {
    const shaped = dropColour(FIRST_LOAD, { kind: 'shape', slot: 1 }, 2)
    expect(fillsOf(shaped)[1].ink).toBe(2)
    expect(fillsOf(shaped)[0].ink).toBe(fillsOf(FIRST_LOAD)[0].ink)

    const patched = dropColour(FIRST_LOAD, { kind: 'patch', slot: 1 }, 3)
    expect(fillsOf(patched)[1].patch).toBe(3)
    expect(fillsOf(patched)[1].ink).toBe(fillsOf(FIRST_LOAD)[1].ink)
  })

  it('sets one slot background from the background well when a slot is selected', () => {
    const patched = dropColour(FIRST_LOAD, { kind: 'background', slot: 1 }, 3)
    expect(fillsOf(patched)[1].patch).toBe(3)
    expect(patched.background).toBe(FIRST_LOAD.background)
  })

  it('clears a patch given the background colour, so it keeps following the background', () => {
    const patched = dropColour(FIRST_LOAD, { kind: 'patch', slot: 1 }, 3)
    const cleared = dropColour(patched, { kind: 'patch', slot: 1 }, patched.background)
    expect(fillsOf(cleared)[1].patch).toBeNull()
  })

  it('sets every shape from the edge, leaving patches alone', () => {
    const next = dropColour(FIRST_LOAD, { kind: 'edge' }, 2)
    expect(fillsOf(next).map((fill) => fill.ink)).toEqual([2, 2, 2, 2])
    expect(fillsOf(next).map((fill) => fill.patch)).toEqual(fillsOf(FIRST_LOAD).map((f) => f.patch))
  })

  it('leaves shapes that are not showing alone when colouring every shape', () => {
    const next = dropColour(FIRST_LOAD, { kind: 'edge' }, 2)
    expect(next.fills.slice(4)).toEqual(FIRST_LOAD.fills.slice(4))
  })

  it('sets the background', () => {
    expect(dropColour(FIRST_LOAD, { kind: 'background' }, 3).background).toBe(3)
  })

  describe('changing the background', () => {
    // Background 0, leaves in 1 and dots in 4.
    const toBackground = (design: Design, ink: number) =>
      dropColour(design, { kind: 'background' }, ink)

    it('leaves shapes alone when none of them has the new colour', () => {
      expect(toBackground(FIRST_LOAD, 3).fills).toEqual(FIRST_LOAD.fills)
    })

    it('gives a shape the old background instead of letting it vanish', () => {
      const next = toBackground(FIRST_LOAD, 1)
      expect(next.background).toBe(1)
      expect(fillsOf(next).map((fill) => fill.ink)).toEqual([0, 4, 4, 0])
    })

    it('does the same for shapes the template is not showing', () => {
      const next = toBackground(FIRST_LOAD, 1)
      expect(next.fills.every((fill) => fill.ink !== 1)).toBe(true)
    })

    it('goes back to what it was when changed back', () => {
      expect(toBackground(toBackground(FIRST_LOAD, 1), 0)).toEqual(FIRST_LOAD)
    })

    it('leaves a shape alone if it sits on a patch', () => {
      const patched = withFill(FIRST_LOAD, 0, { patch: 2 })
      expect(fillsOf(toBackground(patched, 1))[0]).toEqual(fillsOf(patched)[0])
    })

    it('keeps a patch showing, and the shape on it', () => {
      const patched = withFill(FIRST_LOAD, 0, { ink: 0, patch: 3 })
      const next = fillsOf(toBackground(patched, 3))[0]
      expect(next.patch).toBe(0)
      expect(next.ink).toBe(3)
    })

    it('never leaves a shape or patch matching what is behind it', () => {
      const designs = [
        FIRST_LOAD,
        ...Object.values(SAMPLES),
        withFill(FIRST_LOAD, 0, { ink: 0, patch: 3 }),
      ]
      for (const design of designs) {
        for (const ink of [0, 1, 2, 3, 4]) {
          const next = toBackground(design, ink)
          for (const { ink: shape, patch } of next.fills) {
            expect(shape).not.toBe(patch ?? next.background)
            expect(patch).not.toBe(next.background)
          }
        }
      }
    })
  })

  it('leaves the design it was given alone, so a preview can be thrown away', () => {
    const before = JSON.stringify(FIRST_LOAD)
    applyDrop(FIRST_LOAD, { kind: 'colour', ink: 2 }, { kind: 'edge' })
    expect(JSON.stringify(FIRST_LOAD)).toBe(before)
  })

  it('sends shapes and colours to the right place', () => {
    const shape = applyDrop(FIRST_LOAD, { kind: 'shape', shape: 'star' }, { kind: 'slot', slot: 0 })
    expect(fillsOf(shape)[0].shape).toBe('star')
    const colour = applyDrop(FIRST_LOAD, { kind: 'colour', ink: 3 }, { kind: 'shape', slot: 0 })
    expect(fillsOf(colour)[0].ink).toBe(3)
  })

  it('names what will happen', () => {
    const colour = { kind: 'colour', ink: 1 } as const
    expect(dropLabel(colour, { kind: 'shape', slot: 0 })).toBe('Shape colour')
    expect(dropLabel(colour, { kind: 'patch', slot: 0 })).toBe('Slot background')
    expect(dropLabel(colour, { kind: 'edge' })).toBe('Every shape')
    expect(dropLabel(colour, { kind: 'background' })).toBe('Background')
    expect(dropLabel(colour, { kind: 'background', slot: 0 })).toBe('Slot background')
    const shape = { kind: 'shape', shape: 'dot' } as const
    expect(dropLabel(shape, { kind: 'slot', slot: 0 })).toBe('Into this slot')
    expect(dropLabel(shape, { kind: 'edge' })).toBe('Fill every slot')
  })

  it('knows which slots react', () => {
    expect(slotsOf(FIRST_LOAD, { kind: 'shape', slot: 2 })).toEqual([2])
    expect(slotsOf(FIRST_LOAD, { kind: 'patch', slot: 2 })).toEqual([])
    expect(slotsOf(FIRST_LOAD, { kind: 'edge' })).toEqual([0, 1, 2, 3])
    expect(slotsOf(FIRST_LOAD, { kind: 'background' })).toEqual([])
    expect(slotsOf(FIRST_LOAD, { kind: 'background', slot: 2 })).toEqual([])
  })
})

describe('moods', () => {
  it('recognises the palette in use', () => {
    expect(moodOf(FIRST_LOAD)?.name).toBe(MOODS[0].name)
  })

  it('counts as custom once a colour is edited', () => {
    expect(moodOf(withColour(FIRST_LOAD, 2, '#123456'))).toBeNull()
  })

  it('is not fooled by the colour picker writing in lower case', () => {
    const lower = { ...FIRST_LOAD, colours: FIRST_LOAD.colours.map((c) => c.toLowerCase()) }
    expect(moodOf(lower)?.name).toBe(MOODS[0].name)
  })

  it('every mood has exactly five colours', () => {
    for (const mood of MOODS) expect(mood.colours).toHaveLength(5)
  })
})

describe('the colour picker', () => {
  it('finds the pure colours', () => {
    expect(hsvToHex({ h: 0, s: 1, v: 1 })).toBe('#ff0000')
    expect(hsvToHex({ h: 1 / 3, s: 1, v: 1 })).toBe('#00ff00')
    expect(hsvToHex({ h: 2 / 3, s: 1, v: 1 })).toBe('#0000ff')
    expect(hsvToHex({ h: 1, s: 1, v: 1 })).toBe('#ff0000')
    expect(hsvToHex({ h: 0.4, s: 0, v: 1 })).toBe('#ffffff')
    expect(hsvToHex({ h: 0.4, s: 1, v: 0 })).toBe('#000000')
  })

  it.each(MOODS.flatMap((mood) => mood.colours))('gets %s back unchanged', (colour) => {
    expect(hsvToHex(hexToHsv(colour))).toBe(colour.toLowerCase())
  })

  // The picker re-syncs whenever these disagree, so a colour that didn't survive the trip would
  // make it re-render forever.
  it('gets every colour back unchanged, not only the moods', () => {
    const channel = (value: number) => value.toString(16).padStart(2, '0')
    for (let r = 0; r < 256; r += 5) {
      for (let g = 0; g < 256; g += 5) {
        for (let b = 0; b < 256; b += 5) {
          const colour = `#${channel(r)}${channel(g)}${channel(b)}`
          if (hsvToHex(hexToHsv(colour)) !== colour) expect(hsvToHex(hexToHsv(colour))).toBe(colour)
        }
      }
    }
  })

  it('reads a colour however it was pasted', () => {
    expect(parseHex('#1E2A5E')).toBe('#1e2a5e')
    expect(parseHex('1e2a5e')).toBe('#1e2a5e')
    expect(parseHex('  #1e2a5e\n')).toBe('#1e2a5e')
    expect(parseHex('#abc')).toBe('#aabbcc')
  })

  it('leaves alone what is not a colour yet', () => {
    expect(parseHex('')).toBeNull()
    expect(parseHex('#1e2a')).toBeNull()
    expect(parseHex('#1e2a5g')).toBeNull()
    expect(parseHex('##1e2a5e')).toBeNull()
  })

  it('has no hue to find in a grey', () => {
    expect(hexToHsv('#808080')).toEqual({ h: 0, s: 0, v: 128 / 255 })
  })
})
