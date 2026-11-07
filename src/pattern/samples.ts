import type { Design, SlotFill } from './model'
import type { ShapeId } from './shapes'
import { MOODS } from './moods'
import { MOST_SLOTS, type TemplateId } from './templates'

export const DEFAULT_SHAPE_SIZE = 0.62

const fill = (shape: ShapeId | null, ink: number, extra: Partial<SlotFill> = {}): SlotFill => ({
  shape,
  ink,
  rotation: 0,
  patch: null,
  ...extra,
})

const sample = (
  mood: number,
  template: TemplateId,
  fills: SlotFill[],
  extra: Partial<Design> = {},
): Design => ({
  template,
  fills: Array.from({ length: MOST_SLOTS }, (_, slot) => fills[slot % fills.length]),
  shapeSize: DEFAULT_SHAPE_SIZE,
  shift: { axis: 'none', amount: 0 },
  turn: 'none',
  alternateColours: false,
  gaps: false,
  angled: false,
  shuffle: 7,
  colours: MOODS[mood].colours,
  background: 0,
  ...extra,
})

/** Hand-made patterns. The tuning panel switches between them in development. */
export const SAMPLES = {
  'Leaves and dots': sample(0, 'fourPatch', [
    fill('leaf', 1),
    fill('dot', 4),
    fill('dot', 4),
    fill('leaf', 1, { rotation: 1 }),
    // The rest of the nine-patch, as a checkerboard
    fill('leaf', 1, { rotation: 1 }),
    fill('dot', 4),
    fill('leaf', 1, { rotation: 1 }),
    fill('dot', 4),
    fill('leaf', 1),
  ]),
  Scales: sample(2, 'wholeCloth', [fill('arch', 1)], {
    shapeSize: 1,
    shift: { axis: 'rows', amount: 0.5 },
  }),
  Circles: sample(
    2,
    'fourPatch',
    [
      fill('arch', 1),
      fill('arch', 1),
      fill('arch', 1, { rotation: 2 }),
      fill('arch', 1, { rotation: 2 }),
    ],
    { shapeSize: 1 },
  ),
  Pinwheel: sample(4, 'halfSquare', [fill('triangle', 2, { patch: 1 }), fill('dot', 3)], {
    turn: 'pinwheel',
  }),
  Rosette: sample(1, 'quarterSquare', [
    fill('chevron', 1),
    fill('chevron', 2, { patch: 3 }),
    fill('chevron', 2, { patch: 3 }),
    fill('chevron', 1),
  ]),
  'Chevron stripes': sample(5, 'twoStacked', [fill('chevron', 1), fill('chevron', 2)], {
    shapeSize: 0.9,
  }),
  'Every shape': sample(3, 'ninePatch', [
    fill('dot', 1),
    fill('ring', 1),
    fill('square', 1),
    fill('diamond', 1),
    fill('triangle', 1),
    fill('chevron', 1),
    fill('cross', 1),
    fill('leaf', 1),
    fill('star', 1),
  ]),
  Seigaiha: sample(
    0,
    'fourPatch',
    [fill('arch', 1), fill('arch', 2), fill('arch', 2), fill('arch', 1)],
    {
      shapeSize: 1,
      shift: { axis: 'rows', amount: 0.5 },
    },
  ),
  // Nine-patch order: corner, top, left, centre, corner, right, corner, bottom, corner
  Sashiko: sample(
    0,
    'ninePatch',
    [
      fill('cross', 0),
      fill('dot', 3),
      fill('dot', 3),
      fill('ring', 4),
      fill('cross', 0),
      fill('dot', 3),
      fill('cross', 0),
      fill('dot', 3),
      fill('cross', 0),
    ],
    { shapeSize: 0.45, background: 1 },
  ),
  'Bauhaus blocks': sample(
    2,
    'fourPatch',
    [
      fill('dot', 3, { patch: 2 }),
      fill('arch', 2, { rotation: 1 }),
      fill(null, 3, { patch: 1 }),
      fill('arch', 0, { rotation: 2, patch: 4 }),
    ],
    { shapeSize: 0.9 },
  ),
  'Memphis pinwheel': sample(3, 'halfSquare', [fill('triangle', 1, { patch: 2 }), fill('dot', 3)], {
    turn: 'pinwheel',
  }),
  Confetti: sample(
    3,
    'ninePatch',
    [
      fill('triangle', 1, { rotation: 1, patch: 4 }),
      fill('leaf', 2, { rotation: 1 }),
      fill('cross', 3),
      fill('ring', 1, { patch: 3 }),
      fill('triangle', 1, { rotation: 2, patch: 4 }),
      fill('cross', 3),
      fill('triangle', 1, { rotation: 0, patch: 4 }),
      fill('leaf', 2),
      fill('triangle', 1, { rotation: 3, patch: 4 }),
    ],
    { shapeSize: 0.55 },
  ),
  // Quarter-square order: top, right, left, bottom
  'Holly rosette': sample(5, 'quarterSquare', [
    fill('leaf', 2),
    fill('dot', 1, { patch: 3 }),
    fill('dot', 1, { patch: 3 }),
    fill('leaf', 2),
  ]),
  'Star block': sample(
    4,
    'ninePatch',
    [
      fill(null, 1, { patch: 2 }),
      fill('diamond', 4),
      fill('diamond', 4),
      fill('star', 0, { patch: 1 }),
      fill(null, 1, { patch: 2 }),
      fill('diamond', 4),
      fill(null, 1, { patch: 2 }),
      fill('diamond', 4),
      fill(null, 1, { patch: 2 }),
    ],
    { shapeSize: 0.8 },
  ),
  Zigzag: sample(
    1,
    'fourPatch',
    [fill('chevron', 1), fill('chevron', 1), fill('chevron', 2), fill('chevron', 2)],
    { shapeSize: 1 },
  ),
} satisfies Record<string, Design>

export type SampleName = keyof typeof SAMPLES

/** A fixed design for tests. */
export const FIRST_LOAD: Design = SAMPLES['Leaves and dots']

/** Good enough for a first look. One is picked at random. */
export const STARTERS: SampleName[] = [
  'Seigaiha',
  'Sashiko',
  'Bauhaus blocks',
  'Memphis pinwheel',
  'Confetti',
  'Holly rosette',
  'Star block',
  'Zigzag',
]

export const pickStarter = (random = Math.random): Design =>
  SAMPLES[STARTERS[Math.floor(random() * STARTERS.length)]]
