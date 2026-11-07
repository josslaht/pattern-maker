import { slotOf, type Selection, type Target } from '@/pattern/colours'
import type { Design } from '@/pattern/model'
import { TEMPLATE_BY_ID, type Point } from '@/pattern/templates'

const pointsOf = (poly: Point[]) => poly.map(([x, y]) => `${x},${y}`).join(' ')

export const MASTER_SQUARE: Point[] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
]

/** Two strokes, so it shows on any colour. */
export const Outline = ({ poly, width }: { poly: Point[]; width: number }) => (
  <>
    <polygon
      points={pointsOf(poly)}
      fill="none"
      stroke="white"
      strokeWidth={width + 2}
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
    <polygon
      points={pointsOf(poly)}
      fill="none"
      stroke="black"
      strokeWidth={width}
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  </>
)

export const SlotOutlines = ({
  design,
  selected,
  target,
  hover,
}: {
  design: Design
  selected: Selection | null
  target: Target | null
  hover: Selection | null
}) => {
  const { slots } = TEMPLATE_BY_ID[design.template]

  const polyOf = (part: Selection | Target): Point[] =>
    part.kind === 'slot' || part.kind === 'slotBackground' ? (slots[part.slot]?.poly ?? []) : []

  const showHover = hover && !target && slotOf(hover) !== slotOf(selected)

  return (
    <>
      {showHover && (
        <g opacity={0.45}>
          <Outline poly={polyOf(hover)} width={1} />
        </g>
      )}
      {selected && <Outline poly={polyOf(selected)} width={3} />}
      {target && <Outline poly={polyOf(target)} width={3} />}
      {target?.kind === 'edge' && (
        <>
          {slots.map((slot, k) => (
            <Outline key={k} poly={slot.poly} width={1} />
          ))}
          <Outline poly={MASTER_SQUARE} width={4} />
        </>
      )}
    </>
  )
}
