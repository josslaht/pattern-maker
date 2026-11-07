import { describe, expect, it } from 'vitest'
import { dropColour } from './colours'
import { placeShape, rotateShape, withFill } from './drops'
import {
  learnedFromChange,
  learnedFromClick,
  nextHint,
  NOTHING_LEARNED,
  parseLearned,
  selectLabel,
  type Learned,
} from './hints'
import { FIRST_LOAD, pickStarter, SAMPLES, STARTERS } from './samples'

const knowing = (changes: Partial<Learned>): Learned => ({ ...NOTHING_LEARNED, ...changes })
const after = (design: typeof FIRST_LOAD) => learnedFromChange(NOTHING_LEARNED, FIRST_LOAD, design)

describe('what a change teaches', () => {
  it('counts a new shape, a rotation or a new layout as changing the tile', () => {
    expect(after(placeShape(FIRST_LOAD, 0, 'star')).tile).toBe(true)
    expect(after(rotateShape(FIRST_LOAD, 0)).tile).toBe(true)
    expect(after({ ...FIRST_LOAD, template: 'ninePatch' }).tile).toBe(true)
  })

  it('does not count the colour a new shape brings with it as choosing a colour', () => {
    // An empty slot whose ink is the background's, which a new shape never gets.
    const empty = withFill(FIRST_LOAD, 0, { shape: null, ink: FIRST_LOAD.background })
    const placed = placeShape(empty, 0, 'star')
    expect(placed.fills[0].ink).not.toBe(empty.fills[0].ink)
    expect(learnedFromChange(NOTHING_LEARNED, empty, placed).colour).toBe(false)
  })

  it('counts painting a shape, a patch, the background or a new mood as colour', () => {
    expect(after(dropColour(FIRST_LOAD, { kind: 'shape', slot: 0 }, 3)).colour).toBe(true)
    expect(after(withFill(FIRST_LOAD, 0, { patch: 2 })).colour).toBe(true)
    expect(after({ ...FIRST_LOAD, background: 2 }).colour).toBe(true)
    expect(after({ ...FIRST_LOAD, colours: SAMPLES.Scales.colours }).colour).toBe(true)
  })

  it('notes when the repeat was first changed, and keeps it', () => {
    const first = learnedFromChange(knowing({ changes: 2 }), FIRST_LOAD, {
      ...FIRST_LOAD,
      gaps: true,
    })
    expect(first.shiftedAt).toBe(3)
    const later = learnedFromChange(first, FIRST_LOAD, { ...FIRST_LOAD, background: 2 })
    expect(later.shiftedAt).toBe(3)
  })

  it('counts any change to how it repeats as shifting', () => {
    expect(after({ ...FIRST_LOAD, shift: { axis: 'rows', amount: 0.5 } }).shifted).toBe(true)
    expect(after({ ...FIRST_LOAD, gaps: true }).shifted).toBe(true)
    expect(after({ ...FIRST_LOAD, background: 2 }).shifted).toBe(false)
  })

  it('remembers a slot was clicked, and ignores the background', () => {
    const once = learnedFromClick(NOTHING_LEARNED, { kind: 'slot', slot: 0 })
    expect(once.clickedSlot).toBe(true)
    expect(learnedFromClick(once, { kind: 'background' })).toBe(once)
  })
})

describe('the next hint', () => {
  const hint = (learned: Partial<Learned>, view: 'tile' | 'pattern' = 'tile') =>
    nextHint(knowing(learned), view, null, 4, 3)

  it('invites changing the tile first, then colour, then a look at the whole pattern', () => {
    expect(hint({})).toBe('tile')
    expect(hint({ tile: true })).toBe('colour')
    expect(hint({ tile: true, colour: true })).toBe('look')
    expect(hint({ tile: true, colour: true, looked: true })).toBe(null)
  })

  it('keeps any order: colour first still leaves the tile invitation open', () => {
    expect(hint({ colour: true })).toBe('tile')
  })

  it('offers the whole pattern after enough changes of any kind', () => {
    expect(hint({ colour: true, changes: 3 })).toBe('tile')
    expect(hint({ colour: true, changes: 4 })).toBe('look')
  })

  it('asks for a colour while something is selected, until one has been chosen', () => {
    const selected = { kind: 'slot', slot: 0 } as const
    expect(nextHint(knowing({}), 'tile', selected, 4, 3)).toBe('colour')
    expect(nextHint(knowing({ colour: true }), 'tile', selected, 4, 3)).toBe('tile')
  })

  it('invites shifting in the Pattern view, then saving, in either view', () => {
    expect(hint({}, 'pattern')).toBe('shift')
    expect(hint({ shifted: true }, 'pattern')).toBe('save')
    expect(hint({ shifted: true })).toBe('save')
  })

  it('has nothing left once it has been saved', () => {
    expect(hint({ shifted: true, saved: true }, 'pattern')).toBe(null)
    expect(hint({ shifted: true, saved: true })).toBe(null)
  })

  it('lets the Save hint go once Save has been opened, saved or not', () => {
    expect(hint({ shifted: true, openedSave: true })).toBe(null)
  })

  it('lets the Save hint go after a few more changes', () => {
    expect(hint({ shifted: true, changes: 7, shiftedAt: 5 })).toBe('save')
    expect(hint({ shifted: true, changes: 8, shiftedAt: 5 })).toBe(null)
  })
})

describe('the label on resting over the tile', () => {
  it('says a click selects the slot, until one has been clicked', () => {
    expect(selectLabel(NOTHING_LEARNED)).toMatch(/slot/)
    expect(selectLabel(knowing({ clickedSlot: true }))).toBeNull()
  })
})

describe('reading what was learned', () => {
  it('gets it back unchanged', () => {
    const learned = knowing({ tile: true, changes: 7 })
    expect(parseLearned(JSON.stringify(learned))).toEqual(learned)
  })

  it('treats anything odd as nothing learned', () => {
    expect(parseLearned(null)).toEqual(NOTHING_LEARNED)
    expect(parseLearned('{')).toEqual(NOTHING_LEARNED)
    expect(parseLearned(JSON.stringify({ tile: 'yes' }))).toEqual(NOTHING_LEARNED)
  })

  it('counts anything missing, like a hint added later, as not done yet', () => {
    expect(parseLearned(JSON.stringify({ tile: true }))).toEqual(knowing({ tile: true }))
  })
})

describe('the starting pattern', () => {
  it('is always one of the starters', () => {
    const starters = STARTERS.map((name) => SAMPLES[name])
    for (const random of [0, 0.3, 0.6, 0.999]) {
      expect(starters).toContain(pickStarter(() => random))
    }
  })
})
