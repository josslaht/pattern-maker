import { describe, expect, it } from 'vitest'
import { withFill } from './drops'
import type { Design } from './model'
import { designFromLink, designToLink, parseDesign } from './saved'
import { FIRST_LOAD, SAMPLES } from './samples'

const saved = (design: unknown) => parseDesign(JSON.stringify(design))

const savedWith = (changes: Record<string, unknown>) => saved({ ...FIRST_LOAD, ...changes })

const savedWithFirstFill = (changes: Record<string, unknown>) =>
  savedWith({
    fills: FIRST_LOAD.fills.map((fill, k) => (k === 0 ? { ...fill, ...changes } : fill)),
  })

describe('reading a saved design', () => {
  it.each(Object.entries(SAMPLES))('gets %s back unchanged', (_, design) => {
    expect(saved(design)).toEqual(design)
  })

  it('gets back everything a person can change', () => {
    let design: Design = {
      ...FIRST_LOAD,
      template: 'quarterSquare',
      shapeSize: 0.37,
      shift: { axis: 'rows', amount: -0.5 },
      turn: 'scatter',
      alternateColours: true,
      gaps: true,
      angled: true,
      shuffle: 12,
      colours: ['#ABCDEF', '#000000', '#ffffff', '#123456', '#fedcba'],
      background: 4,
    }
    design = withFill(design, 0, { shape: null, patch: 3 })

    expect(saved(design)).toEqual(design)
  })

  it('reads a design saved under the old names', () => {
    const { shift, shuffle, alternateColours, colours, fills, ...rest } = SAMPLES.Seigaiha
    const old = {
      ...rest,
      offset: shift,
      seed: shuffle,
      swap: alternateColours,
      colors: colours,
      fills: fills.map(({ shape, rotation, ...fill }) => ({
        ...fill,
        motif: shape,
        turn: rotation,
      })),
    }
    expect(saved(old)).toEqual(SAMPLES.Seigaiha)
  })

  it('finds nothing where there is nothing', () => {
    expect(parseDesign(null)).toBeNull()
    expect(parseDesign('')).toBeNull()
  })

  it.each(['not json', 'null', '7', '[]', '{}', '{"template":"fourPatch"}'])(
    'refuses %s',
    (text) => {
      expect(parseDesign(text)).toBeNull()
    },
  )

  it('refuses a design missing anything', () => {
    for (const key of Object.keys(FIRST_LOAD).filter((key) => key !== 'angled')) {
      expect(savedWith({ [key]: undefined })).toBeNull()
    }
  })

  it('opens a design from before the angle switch straight', () => {
    const { angled: _, ...old } = { ...FIRST_LOAD, angled: true }
    expect(saved(old)?.angled).toBe(false)
    expect(savedWith({ angled: 'yes' })).toBeNull()
  })

  it('refuses a tile and shapes it can not draw', () => {
    expect(savedWith({ template: 'hexagons' })).toBeNull()
    expect(savedWith({ template: 'constructor' })).toBeNull()
    expect(savedWith({ fills: FIRST_LOAD.fills.slice(1) })).toBeNull()
    expect(savedWith({ fills: 'leaf' })).toBeNull()
    expect(savedWithFirstFill({ shape: 'blob' })).toBeNull()
    expect(savedWithFirstFill({ shape: 'constructor' })).toBeNull()
    expect(savedWithFirstFill({ rotation: 4 })).toBeNull()
  })

  it('refuses colours outside the five', () => {
    expect(savedWithFirstFill({ ink: 5 })).toBeNull()
    expect(savedWithFirstFill({ patch: -1 })).toBeNull()
    expect(savedWith({ background: 5 })).toBeNull()
    expect(savedWith({ colours: FIRST_LOAD.colours.slice(1) })).toBeNull()
  })

  // The picker keeps its thumbs in step by turning colours to and from six digits, so anything
  // else would never match and it would re-render forever.
  it('refuses colours the picker can not read', () => {
    const [, ...rest] = FIRST_LOAD.colours
    expect(savedWith({ colours: ['#fff', ...rest] })).toBeNull()
    expect(savedWith({ colours: ['red', ...rest] })).toBeNull()
  })

  it('refuses settings it does not know', () => {
    expect(savedWith({ turn: 'spiral' })).toBeNull()
    expect(savedWith({ shift: { axis: 'diagonal', amount: 0 } })).toBeNull()
    expect(savedWith({ alternateColours: 'yes' })).toBeNull()
    expect(savedWith({ shapeSize: null })).toBeNull()
  })
})

describe('sharing a design as a link', () => {
  it.each(Object.entries(SAMPLES))('gets %s back unchanged', (_, design) => {
    expect(designFromLink('#' + designToLink(design))).toEqual(design)
  })

  it('stays safe to put in a link', () => {
    expect(designToLink(FIRST_LOAD)).toMatch(/^d=[\w-]+$/)
  })

  it('finds nothing in a link without a design', () => {
    expect(designFromLink('')).toBeNull()
    expect(designFromLink('#somewhere')).toBeNull()
    expect(designFromLink('#d=not a design')).toBeNull()
    expect(designFromLink('#d=' + btoa('{"template":"nope"}'))).toBeNull()
  })
})
