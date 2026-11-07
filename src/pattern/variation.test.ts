import { describe, expect, it } from 'vitest'
import { copyAt } from './layout'
import type { Design, SlotFill, TileTurn } from './model'
import { MOODS } from './moods'
import { SHAPES, type ShapeId } from './shapes'
import { FIRST_LOAD, SAMPLES } from './samples'
import type { TemplateId } from './templates'
import { usefulVariations } from './variation'

const fill = (shape: ShapeId | null, ink = 1, extra: Partial<SlotFill> = {}): SlotFill => ({
  shape,
  ink,
  rotation: 0,
  patch: null,
  ...extra,
})

const tile = (template: TemplateId, fills: SlotFill[], extra: Partial<Design> = {}): Design => ({
  ...FIRST_LOAD,
  template,
  fills,
  ...extra,
})

const ALL_TURNS: TileTurn[] = ['none', 'pinwheel', 'mirror', 'scatter']

describe('hiding what does nothing', () => {
  it('offers no way of turning a four-patch of dots', () => {
    const { turns } = usefulVariations(tile('fourPatch', Array(4).fill(fill('dot'))))
    expect(turns).toEqual(['none'])
  })

  it('offers every way of turning a tile with nothing symmetrical about it', () => {
    expect(usefulVariations(SAMPLES['Leaves and dots']).turns).toEqual(ALL_TURNS)
  })

  it('offers nothing at all for an empty tile', () => {
    expect(usefulVariations(tile('wholeCloth', [fill(null)]))).toEqual({
      turns: ['none'],
      shownTurn: 'none',
      alternateColours: false,
      gaps: false,
    })
  })

  it('knows a leaf looks the same flipped, so Mirror would change nothing', () => {
    const { turns } = usefulVariations(tile('wholeCloth', [fill('leaf')]))
    expect(turns).toEqual(['none', 'pinwheel', 'scatter'])
  })

  it('shows the option that looks like the pattern, when the tile cannot show the chosen one', () => {
    const leaf = tile('wholeCloth', [fill('leaf')])
    expect(usefulVariations({ ...leaf, turn: 'pinwheel' }).shownTurn).toBe('pinwheel')
    expect(usefulVariations({ ...leaf, turn: 'mirror' }).shownTurn).toBe('none')

    const dots = tile('fourPatch', Array(4).fill(fill('dot')))
    expect(usefulVariations({ ...dots, turn: 'pinwheel' }).shownTurn).toBe('none')
    expect(usefulVariations({ ...dots, turn: 'scatter' }).shownTurn).toBe('none')
  })

  it('knows flipping a triangle is not the same as turning it', () => {
    const { turns } = usefulVariations(tile('wholeCloth', [fill('triangle')]))
    expect(turns).toEqual(ALL_TURNS)
  })

  it('counts the same result from a different option as nothing new', () => {
    // Dots on one diagonal: mirroring lands them exactly where turning does.
    const { turns } = usefulVariations(tile('halfSquare', [fill('dot'), fill('dot')]))
    expect(turns).toEqual(['none', 'pinwheel', 'scatter'])
  })

  it('sees patches as fabric, so two halves of one colour are one piece of cloth', () => {
    const patch = fill(null, 1, { patch: 2 })
    expect(usefulVariations(tile('twoStacked', [patch, patch])).turns).toEqual(['none'])
    expect(usefulVariations(tile('twoStacked', [patch, fill(null)])).turns).not.toEqual(['none'])
  })

  it('does not count a patch in the background colour as anything', () => {
    const patch = fill(null, 1, { patch: FIRST_LOAD.background })
    const { turns, gaps } = usefulVariations(tile('twoStacked', [patch, fill(null)]))
    expect(turns).toEqual(['none'])
    expect(gaps).toBe(false)
  })

  it('offers alternating colours only when it would change a colour you can see', () => {
    const background = FIRST_LOAD.background
    expect(usefulVariations(tile('wholeCloth', [fill('dot', 1)])).alternateColours).toBe(true)
    expect(usefulVariations(tile('wholeCloth', [fill('dot', background)])).alternateColours).toBe(
      false,
    )

    const sameColours = MOODS[0].colours.map((colour, ink) =>
      ink === background ? colour : '#112233',
    )
    const design = tile('wholeCloth', [fill('dot', 1)], { colours: sameColours })
    expect(usefulVariations(design).alternateColours).toBe(false)
  })

  it('rests on every shape being the same either side of its centre line', () => {
    for (const { box, art } of SHAPES) {
      expect(art.x + art.width / 2).toBeCloseTo(box.x + box.side / 2)
    }
  })
})

describe('leaving tiles out', () => {
  it('always leaves out the same number, whatever the shuffle', () => {
    for (let shuffle = 0; shuffle < 200; shuffle++) {
      let hidden = 0
      for (let j = 0; j < 4; j++) {
        for (let i = 0; i < 4; i++) {
          if (copyAt({ ...FIRST_LOAD, gaps: true, shuffle }, i, j).hidden) hidden++
        }
      }
      expect(hidden).toBe(3)
    }
  })

  it('never does it unless asked', () => {
    expect(copyAt({ ...FIRST_LOAD, gaps: false }, 1, 2).hidden).toBe(false)
  })
})
