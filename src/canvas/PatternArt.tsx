import { memo } from 'react'
import type { TileRange } from '@/pattern/camera'
import { copyAt, copyTransform } from '@/pattern/layout'
import { fillsOf, type Design } from '@/pattern/model'
import { fitToSlot, SHAPE_BY_ID, type ShapeId } from '@/pattern/shapes'
import { placeInSlot } from '@/pattern/placement'
import { TEMPLATE_BY_ID } from '@/pattern/templates'
import type { Tuning } from '@/tuning/config'

export const IDENTITY_INKS = [0, 1, 2, 3, 4]

const LAYERS = ['patches', 'shapes'] as const

/** `bleed` is screen pixels. Files use tile units, since not every program scales strokes. */
type Art = {
  design: Design
  optical: Tuning['optical']
  bleed: number
  forFile?: boolean
}

const ShapeArt = ({
  shape,
  cx,
  cy,
  size,
  degrees,
  colour,
  bleed,
  forFile,
}: {
  shape: ShapeId
  cx: number
  cy: number
  size: number
  degrees: number
  colour: string
  bleed: number
  forFile?: boolean
}) => {
  const { box, body } = SHAPE_BY_ID[shape]
  const centreX = box.x + box.side / 2
  const centreY = box.y + box.side / 2
  const scale = size / box.side

  return (
    <g
      transform={`translate(${cx} ${cy}) rotate(${degrees}) scale(${scale}) translate(${-centreX} ${-centreY})`}
      fill={colour}
      stroke={colour}
      // Screen: .bleed in index.css keeps it in pixels. File: tile units to the 24 × 24 grid.
      strokeWidth={forFile ? bleed / scale : bleed}
      strokeLinejoin="round"
      className={forFile ? undefined : 'bleed'}
      // Some programs read currentColor as black
      dangerouslySetInnerHTML={{ __html: body.replaceAll('currentColor', colour) }}
    />
  )
}

type Layer = 'patches' | 'shapes'

export const TileArt = ({
  design,
  optical,
  bleed,
  forFile,
  inks,
  layer,
}: Art & { inks: number[]; layer?: Layer }) => {
  const { slots } = TEMPLATE_BY_ID[design.template]
  const fills = fillsOf(design)
  const colourOf = (ink: number) => design.colours[inks[ink]]

  return (
    <>
      {slots.map((slot, k) => {
        const patch = fills[k]?.patch
        if (patch == null || layer === 'shapes') return null
        return (
          <polygon
            key={k}
            points={slot.poly.map(([x, y]) => `${x},${y}`).join(' ')}
            fill={colourOf(patch)}
            stroke={colourOf(patch)}
            strokeWidth={bleed}
            vectorEffect={forFile ? undefined : 'non-scaling-stroke'}
          />
        )
      })}
      {slots.map((slot, k) => {
        const fill = fills[k]
        if (!fill?.shape || layer === 'patches') return null
        const place = placeInSlot(slot, fill.shape, fill.rotation)
        return (
          <g key={k} data-slot={k}>
            <ShapeArt
              shape={fill.shape}
              cx={place.cx}
              cy={place.cy}
              size={place.size * fitToSlot(design.shapeSize, optical[fill.shape])}
              degrees={place.degrees}
              colour={colourOf(fill.ink)}
              bleed={bleed}
              forFile={forFile}
            />
          </g>
        )
      })}
    </>
  )
}

/**
 * Every copy's patches go down before any copy's shapes, or a neighbour's patch bleed draws a
 * hairline over shapes along the shared edge. On screen hidden copies stay, so they can shrink away.
 */
export const PatternCopies = memo(
  ({ design, optical, bleed, forFile, range }: Art & { range: TileRange }) => {
    const { i0, i1, j0, j1 } = range
    const variants = new Map<string, number[]>()
    const copies: { key: string; id: string; transform: string; hidden: boolean }[] = []

    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const copy = copyAt(design, i, j)
        if (copy.hidden && forFile) continue

        const id = `tile-${copy.inks.join('')}`
        variants.set(id, copy.inks)

        copies.push({
          key: `${i},${j}`,
          id,
          transform: copyTransform(design, i, j),
          hidden: copy.hidden,
        })
      }
    }

    return (
      <>
        <defs>
          {[...variants].flatMap(([id, inks]) =>
            LAYERS.map((layer) => (
              <g key={`${id}-${layer}`} id={`${id}-${layer}`}>
                <TileArt
                  design={design}
                  optical={optical}
                  bleed={bleed}
                  forFile={forFile}
                  inks={inks}
                  layer={layer}
                />
              </g>
            )),
          )}
        </defs>
        <rect
          x={i0}
          y={j0}
          width={i1 - i0 + 1}
          height={j1 - j0 + 1}
          fill={design.colours[design.background]}
        />
        {LAYERS.map((layer) =>
          copies.map(({ key, id, transform, hidden }) => (
            // Older design programs only follow xlink:href
            <use
              key={`${key}-${layer}`}
              data-copy={key}
              xlinkHref={`#${id}-${layer}`}
              transform={transform}
              visibility={hidden ? 'hidden' : undefined}
            />
          )),
        )}
      </>
    )
  },
)
