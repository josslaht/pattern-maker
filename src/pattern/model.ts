import type { ShapeId } from './shapes'
import { TEMPLATE_BY_ID, type TemplateId } from './templates'

export type SlotFill = {
  shape: ShapeId | null
  rotation: number
  ink: number
  patch: number | null
}

export type ShiftAxis = 'none' | 'rows' | 'cols'

/** `amount` is in tiles. */
export type Shift = { axis: ShiftAxis; amount: number }

export type TileTurn = 'none' | 'pinwheel' | 'mirror' | 'scatter'

/** Everything the person made: what undo covers and what saving draws. */
export type Design = {
  template: TemplateId
  /** As many as the biggest template has. Each template shows the first few. */
  fills: SlotFill[]
  shapeSize: number
  shift: Shift
  turn: TileTurn
  alternateColours: boolean
  gaps: boolean
  /** The Pattern view and saved files turn 45°. The master stays upright. */
  angled: boolean
  shuffle: number
  colours: string[]
  background: number
}

export const fillsOf = ({ fills, template }: Design): SlotFill[] =>
  fills.slice(0, TEMPLATE_BY_ID[template].slots.length)
