import { useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { hexToHsv, hsvToHex, parseHex, type Hsv } from '@/pattern/colours'

const clamp = (value: number) => Math.min(1, Math.max(0, value))

const ARROW_STEP = 0.02

/** Half the thumb, so it stops short of each end. */
const THUMB_INSET = 8

const along = (position: number) =>
  `calc(${position} * (100% - ${THUMB_INSET * 2}px) + ${THUMB_INSET}px)`

/** The colour field, or the hue strip without `y`. */
const Area = ({
  label,
  x,
  y,
  className,
  style,
  onMove,
}: {
  label: string
  x: number
  y?: number
  className: string
  style: CSSProperties
  onMove: (x: number, y: number) => void
}) => {
  const moveTo = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    onMove(
      clamp((event.clientX - box.left - THUMB_INSET) / (box.width - THUMB_INSET * 2)),
      clamp((event.clientY - box.top - THUMB_INSET) / (box.height - THUMB_INSET * 2)),
    )
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const dx = { ArrowLeft: -ARROW_STEP, ArrowRight: ARROW_STEP }[event.key] ?? 0
    const dy = { ArrowUp: -ARROW_STEP, ArrowDown: ARROW_STEP }[event.key] ?? 0
    if (!dx && !dy) return
    event.preventDefault()
    onMove(clamp(x + dx), clamp((y ?? 0) + dy))
  }

  return (
    <div
      role="slider"
      aria-label={label}
      aria-valuenow={Math.round(x * 100)}
      tabIndex={0}
      className={`relative cursor-crosshair touch-none outline-none select-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      style={style}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        moveTo(event)
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) moveTo(event)
      }}
      onKeyDown={onKeyDown}
    >
      <span
        className="pointer-events-none absolute size-4 -translate-1/2 rounded-full shadow-sm ring-2 ring-white"
        style={{ left: along(x), top: y === undefined ? '50%' : along(y) }}
      />
    </div>
  )
}

const HUES = 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)'
const SHADES =
  'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)'

/** A six-digit colour applies as you type. #abc waits for blur, as it may be the start of one. */
const HexField = ({ colour, onChange }: { colour: string; onChange: (colour: string) => void }) => {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <input
      aria-label="Colour as hex"
      className="h-8 w-22 shrink-0 rounded-(--bar-inner) bg-muted text-center text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      spellCheck={false}
      autoComplete="off"
      value={draft ?? colour.toUpperCase()}
      onFocus={(event) => event.target.select()}
      onChange={(event) => {
        const text = event.target.value
        setDraft(text)
        const typed = parseHex(text)
        if (typed && text.replace(/[#\s]/g, '').length === 6) onChange(typed)
      }}
      onBlur={() => {
        const typed = draft === null ? null : parseHex(draft)
        if (typed) onChange(typed)
        setDraft(null)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') setDraft(null)
      }}
    />
  )
}

export const ColourPicker = ({
  colour,
  onChange,
}: {
  colour: string
  onChange: (colour: string) => void
}) => {
  // Kept apart from the hex, which loses its hue at black or grey and would jump the hue thumb.
  const [hsv, setHsv] = useState(() => hexToHsv(colour))

  // Undo or a new mood changed the colour
  if (hsvToHex(hsv) !== colour.toLowerCase()) setHsv(hexToHsv(colour))

  const change = (next: Hsv) => {
    setHsv(next)
    onChange(hsvToHex(next))
  }

  return (
    <div className="flex flex-col gap-(--bar-gap)">
      <Area
        label="Shade"
        x={hsv.s}
        y={1 - hsv.v}
        className="h-28 rounded-(--bar-inner)"
        style={{ backgroundImage: SHADES, backgroundColor: hsvToHex({ h: hsv.h, s: 1, v: 1 }) }}
        onMove={(s, y) => change({ ...hsv, s, v: 1 - y })}
      />
      <div className="flex items-center gap-2">
        <Area
          label="Colour"
          x={hsv.h}
          className="h-4 flex-1 rounded-full"
          style={{ backgroundImage: HUES }}
          onMove={(h) => change({ ...hsv, h })}
        />
        <HexField colour={colour} onChange={onChange} />
      </div>
    </div>
  )
}
