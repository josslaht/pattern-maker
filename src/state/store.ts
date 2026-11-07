import { create } from 'zustand'
import { CUSTOM_RANGE, LAYOUTS, type LayoutId, type Size } from '@/pattern/camera'
import {
  applyDrop,
  dropColour,
  dropLabel,
  slotOf,
  slotsOf,
  targetOf,
  withColour,
  type Carried,
  type Selection,
  type Target,
} from '@/pattern/colours'
import { placeShape, rotateShape, withFill } from '@/pattern/drops'
import {
  afterChange,
  afterGesture,
  changedShapes,
  NO_HISTORY,
  redone,
  undone,
  type History,
} from '@/pattern/history'
import { learnedFromChange, learnedFromClick, type Learned } from '@/pattern/hints'
import { fillsOf, type Design, type ShiftAxis, type TileTurn } from '@/pattern/model'
import type { ShapeId } from '@/pattern/shapes'
import { placeInSlot, type Placement } from '@/pattern/placement'
import { pickStarter } from '@/pattern/samples'
import { designFromLink } from '@/pattern/saved'
import { TEMPLATE_BY_ID, type TemplateId } from '@/pattern/templates'
import { readLearned, readSavedDesign, saveDesign, saveLearned } from './saved'

export type View = 'tile' | 'pattern'

export type Intro = 'looking' | 'flying' | 'arriving' | null

export type Drawer = 'tile' | 'shapes' | 'moods' | 'picker'

type AdjustableLayout = Exclude<LayoutId, 'tile'>

/** In screen coordinates. */
export type Landing = { x: number; y: number; scale: number; opacity: number }

/** `drop` lands on a shape the preview already shows. `place` grows one in. */
export type Flourish = {
  kind: 'drop' | 'place' | 'rotate'
  slots: number[]
  id: number
  /** Where a rotated shape was, so it can swing from there. */
  from?: Placement
}

const ACROSS_RANGE = [1, 16]
const HINT_MS = 2500

const clamp = (value: number, [min, max]: number[]) => Math.min(max, Math.max(min, value))

type AppState = {
  design: Design
  history: History
  /** From here down is view state, which undo leaves alone. */
  view: View
  saving: boolean
  layout: LayoutId
  across: Record<AdjustableLayout, number>
  customSize: Size
  /** Never a selection and an open drawer at once, except Shapes. */
  selected: Selection | null
  drawer: Drawer | null
  /** Stays set while the picker folds away. */
  editingInk: number
  drag: { carried: Carried; origin: Landing } | null
  target: Target | null
  landing: Landing | null
  cursorLabel: string | null
  flourish: Flourish | null
  hint: string | null
  saves: number
  intro: Intro
  peeking: boolean
  learned: Learned

  advanceIntro: () => void
  loadDesign: (design: Design) => void
  undo: () => void
  redo: () => void
  endGesture: () => void

  setTemplate: (template: TemplateId) => void
  setShapeSize: (shapeSize: number) => void
  setShift: (axis: ShiftAxis) => void
  setView: (view: View) => void
  setPeeking: (peeking: boolean) => void
  openSave: () => void
  closeSave: () => void
  setLayout: (layout: LayoutId) => void
  stepAcross: (by: number) => void
  setCustomSize: (size: Size) => void

  toggleDrawer: (drawer: Drawer) => void
  editInk: (ink: number) => void

  setMood: (colours: string[]) => void
  setColour: (ink: number, colour: string) => void

  setTurn: (turn: TileTurn) => void
  setAlternateColours: (alternateColours: boolean) => void
  setGaps: (gaps: boolean) => void
  reshuffle: () => void

  beginDrag: (carried: Carried, origin: Landing) => void
  aimDrag: (target: Target | null) => void
  dropDrag: (landing: Landing) => void
  cancelDrag: () => void
  setCursorLabel: (label: string | null) => void

  select: (selection: Selection) => void
  deselect: () => void
  placeInSelected: (shape: ShapeId) => void
  rotateSelected: () => void
  removeSelected: () => void
  paintSelected: (ink: number) => void
  showHint: (hint: string) => void
  showSaved: (name: string) => void
}

let hintTimer: ReturnType<typeof setTimeout>
let flourishId = 0

const flourish = (kind: Flourish['kind'], slots: number[]): Flourish => ({
  kind,
  slots,
  id: ++flourishId,
})

/** Every design change goes through here, so undo sees it. `gesture` makes a drag one step. */
const change = (state: AppState, design: Design, gesture?: string) => {
  const history = afterChange(state.history, state.design, design, gesture)
  const isNewStep = history !== state.history
  return {
    design,
    history,
    learned: isNewStep ? learnedFromChange(state.learned, state.design, design) : state.learned,
  }
}

/** Slots only mean something within their template. */
const selectionAfter = (selected: Selection | null, before: Design, after: Design) =>
  selected?.kind !== 'background' && after.template !== before.template ? null : selected

const travel = (state: AppState, step: { design: Design; history: History } | null) => {
  if (!step || state.drag) return {}
  return {
    ...step,
    selected: selectionAfter(state.selected, state.design, step.design),
    flourish: flourish('place', changedShapes(state.design, step.design)),
  }
}

// A shared link isn't saved until it's changed, so your own saved work stays put.
const shared = designFromLink(location.hash)
const saved = readSavedDesign()

export const useApp = create<AppState>((set, get) => ({
  design: shared ?? saved ?? pickStarter(),
  history: NO_HISTORY,
  view: 'tile',
  saving: false,
  layout: 'phone',
  across: { phone: 4, tablet: 5, desktop: 8, square: 4, a4: 5, custom: 6 },
  customSize: LAYOUTS.custom.size!,
  selected: null,
  // The intro opens Shapes as it ends.
  drawer: null,
  editingInk: 0,
  drag: null,
  target: null,
  landing: null,
  cursorLabel: null,
  flourish: null,
  hint: null,
  saves: 0,
  intro: 'looking',
  peeking: false,
  learned: readLearned(),

  advanceIntro: () =>
    set(({ intro }) => {
      if (intro === 'looking') return { intro: 'flying' }
      if (intro === 'flying') return { intro: 'arriving', drawer: 'shapes' }
      return { intro: null }
    }),

  loadDesign: (design) => set({ design, history: NO_HISTORY, selected: null }),

  undo: () => set((state) => travel(state, undone(state.history, state.design))),

  redo: () => set((state) => travel(state, redone(state.history, state.design))),

  endGesture: () =>
    set((state) => {
      const history = afterGesture(state.history, state.design)
      return history === state.history ? {} : { history }
    }),

  setTemplate: (template) =>
    set((state) => ({ ...change(state, { ...state.design, template }), selected: null })),

  setShapeSize: (shapeSize) =>
    set((state) => change(state, { ...state.design, shapeSize }, 'shapeSize')),

  setShift: (axis) =>
    set((state) =>
      change(state, {
        ...state.design,
        shift: { axis, amount: axis === 'none' ? 0 : 0.5 },
      }),
    ),

  // Keeps the selection and drawers, so you can look at the pattern and come back.
  setView: (view) =>
    set(({ learned, saving }) =>
      saving
        ? {}
        : {
            view,
            learned: view === 'pattern' && !learned.looked ? { ...learned, looked: true } : learned,
          },
    ),

  openSave: () =>
    set(({ learned }) => ({
      saving: true,
      learned: learned.openedSave ? learned : { ...learned, openedSave: true },
    })),

  closeSave: () => set({ saving: false }),

  setPeeking: (peeking) => set({ peeking }),

  setLayout: (layout) => set({ layout }),

  stepAcross: (by) =>
    set(({ layout, across }) =>
      layout === 'tile'
        ? {}
        : { across: { ...across, [layout]: clamp(across[layout] + by, ACROSS_RANGE) } },
    ),

  setCustomSize: ({ width, height }) =>
    set({
      customSize: {
        width: clamp(Math.round(width), CUSTOM_RANGE),
        height: clamp(Math.round(height), CUSTOM_RANGE),
      },
    }),

  toggleDrawer: (drawer) =>
    set((state) => ({
      drawer: state.drawer === drawer ? null : drawer,
      selected: drawer === 'shapes' ? state.selected : null,
    })),

  editInk: (ink) =>
    set(({ drawer, editingInk }) => ({
      drawer: drawer === 'picker' && editingInk === ink ? null : 'picker',
      editingInk: ink,
    })),

  setMood: (colours) => set((state) => change(state, { ...state.design, colours })),

  setColour: (ink, colour) =>
    set((state) => change(state, withColour(state.design, ink, colour), `colour-${ink}`)),

  setTurn: (turn) => set((state) => change(state, { ...state.design, turn })),

  setAlternateColours: (alternateColours) =>
    set((state) => change(state, { ...state.design, alternateColours })),

  setGaps: (gaps) => set((state) => change(state, { ...state.design, gaps })),

  reshuffle: () =>
    set((state) => change(state, { ...state.design, shuffle: state.design.shuffle + 1 })),

  beginDrag: (carried, origin) => set({ drag: { carried, origin }, target: null, landing: null }),

  aimDrag: (target) =>
    set(({ drag }) => ({ target, cursorLabel: drag && target && dropLabel(drag.carried, target) })),

  dropDrag: (landing) => {
    const state = get()
    const { design, drag, target, selected } = state
    if (!drag || !target) return
    const droppedShape = target.kind === 'slot'
    set({
      ...change(state, applyDrop(design, drag.carried, target)),
      selected: droppedShape
        ? { kind: 'slot', slot: target.slot }
        : target.kind === 'edge'
          ? null
          : selected,
      flourish: flourish('drop', slotsOf(design, target)),
      landing,
      drag: null,
      target: null,
      cursorLabel: null,
    })
  },

  cancelDrag: () =>
    set(({ drag }) => ({ landing: drag?.origin, drag: null, target: null, cursorLabel: null })),

  setCursorLabel: (cursorLabel) => set({ cursorLabel }),

  // Clicking the selection again lets go of it. A slot's background goes back to the slot.
  select: (selection) =>
    set(({ selected, drawer, learned }) => {
      const same = JSON.stringify(selected) === JSON.stringify(selection)
      const back =
        selection.kind === 'slotBackground' ? { kind: 'slot' as const, slot: selection.slot } : null
      return {
        selected: same ? back : selection,
        drawer: drawer === 'shapes' ? drawer : null,
        learned: learnedFromClick(learned, selection),
      }
    }),

  // Shapes stay open after the selection goes, so you can keep placing.
  deselect: () =>
    set(({ selected, drawer }) => ({
      selected: null,
      drawer: selected && drawer === 'shapes' ? drawer : null,
    })),

  placeInSelected: (shape) =>
    set((state) => {
      const slot = slotOf(state.selected)
      if (slot === null) return {}
      return {
        ...change(state, placeShape(state.design, slot, shape)),
        selected: { kind: 'slot', slot },
        flourish: flourish('place', [slot]),
      }
    }),

  rotateSelected: () =>
    set((state) => {
      const slot = slotOf(state.selected)
      if (slot === null) return {}
      const next = rotateShape(state.design, slot)
      if (next === state.design) return {}
      const { shape, rotation } = fillsOf(state.design)[slot]
      const from = placeInSlot(TEMPLATE_BY_ID[state.design.template].slots[slot], shape!, rotation)
      return { ...change(state, next), flourish: { ...flourish('rotate', [slot]), from } }
    }),

  // The shape, or the patch if there is no shape. The slot stays selected.
  removeSelected: () =>
    set((state) => {
      const slot = slotOf(state.selected)
      if (slot === null) return {}
      const { design } = state
      if (fillsOf(design)[slot].shape) {
        return {
          ...change(state, withFill(design, slot, { shape: null })),
          selected: { kind: 'slot', slot },
        }
      }
      return change(state, withFill(design, slot, { patch: null }))
    }),

  paintSelected: (ink) =>
    set((state) => {
      const { selected, design } = state
      if (!selected) return {}
      return {
        ...change(state, dropColour(design, targetOf(design, selected), ink)),
        selected:
          selected.kind === 'slotBackground' ? { kind: 'slot', slot: selected.slot } : selected,
      }
    }),

  showHint: (hint) => {
    clearTimeout(hintTimer)
    set({ hint })
    hintTimer = setTimeout(() => set({ hint: null }), HINT_MS)
  },

  showSaved: (name) => {
    set(({ saves, learned }) => ({
      saves: saves + 1,
      learned: learned.saved ? learned : { ...learned, saved: true },
    }))
    get().showHint(`Saved ${name}`)
  },
}))

// Only after a change, so someone who just looked gets a new starter next time.
useApp.subscribe((state, previous) => {
  if (state.design !== previous.design) {
    saveDesign(state.design)
    // The link would bring back what was sent rather than what was made.
    if (location.hash) history.replaceState(null, '', location.pathname + location.search)
  }
  if (state.learned !== previous.learned) saveLearned(state.learned)
})

// A hot reload makes a second store that old listeners don't see. Reload instead.
if (import.meta.hot) {
  import.meta.hot.accept(() => location.reload())
}
