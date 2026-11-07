import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { MinusIcon, PlusIcon, XIcon } from 'lucide-react'
import { savePattern, patternSvg, type FileKind } from '@/canvas/savePattern'
import { Button } from '@/components/ui/button'
import {
  CUSTOM_RANGE,
  outputSize,
  LAYOUTS,
  outputFrame,
  type LayoutId,
  type Rect,
  type Size,
} from '@/pattern/camera'
import { repeatBlock } from '@/pattern/layout'
import type { Design } from '@/pattern/model'
import { useApp } from '@/state/store'
import { useTuning } from '@/tuning/store'
import { toTransition } from '@/tuning/transition'
import { ChosenPill } from './ChosenPill'
import { Tip } from './Tip'

const LAYOUT_IDS = Object.keys(LAYOUTS) as LayoutId[]

const useElementSize = () => {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<Size | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return [ref, size] as const
}

const fit = (area: Size, aspect: number, share: number): Size => {
  const width = Math.min(area.width * share, area.height * share * aspect)
  return { width, height: width / aspect }
}

const acrossFor = (layout: LayoutId, across: Record<string, number>) =>
  layout === 'tile' ? 1 : across[layout]

/** The actual file, drawn at preview size. Keeps the old image until the new one is ready. */
const usePatternImage = (design: Design, frame: Rect, size: Size | null) => {
  const [src, setSrc] = useState<string | null>(null)
  const width = size && Math.round(size.width)
  const height = size && Math.round(size.height)
  const { x, y, width: frameWidth, height: frameHeight } = frame

  useEffect(() => {
    if (!width || !height) return
    let live = true
    const frame = { x, y, width: frameWidth, height: frameHeight }
    patternSvg(design, frame, { width, height }).then(async (svg) => {
      const next = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
      const image = new Image()
      image.src = next
      await image.decode().catch(() => {})
      if (live) setSrc(next)
    })
    return () => {
      live = false
    }
  }, [design, x, y, frameWidth, frameHeight, width, height])

  return src
}

const LayoutChoice = ({ layout, chosen }: { layout: LayoutId; chosen: boolean }) => {
  const design = useApp((app) => app.design)
  const across = useApp((app) => acrossFor(layout, app.across))
  const customSize = useApp((app) => app.customSize)
  const setLayout = useApp((app) => app.setLayout)
  const thumb = useTuning((tuning) => tuning.save.thumb)
  const { pressScale } = useTuning((tuning) => tuning.canvas)
  const press = useTuning((tuning) => tuning.motion.press)

  const frame = outputFrame(design, layout, across, customSize)
  const size = fit({ width: thumb, height: thumb }, frame.width / frame.height, 1)
  const src = usePatternImage(design, frame, size)

  return (
    <motion.button
      type="button"
      className="relative flex flex-col items-center gap-2 rounded-2xl px-1 pt-3 pb-2 text-xs outline-none hover:bg-background/50 focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-pressed={chosen}
      onClick={() => setLayout(layout)}
      whileTap={{ scale: pressScale }}
      transition={toTransition(press)}
    >
      {chosen && <ChosenPill id="layout-chosen" radius={16} className="inset-0 bg-background" />}
      <span className="relative flex items-center justify-center" style={{ height: thumb }}>
        <span
          className="block overflow-hidden rounded-[3px] bg-muted-foreground/15 shadow-sm ring-1 ring-foreground/10"
          style={size}
        >
          {src && <img src={src} alt="" className="block size-full" draggable={false} />}
        </span>
      </span>
      <span className="relative">{LAYOUTS[layout].label}</span>
    </motion.button>
  )
}

/** Clamps on blur, so typing 1 on the way to 1200 doesn't flash a sliver. */
const SideInput = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) => {
  const [draft, setDraft] = useState<string | null>(null)
  const [min, max] = CUSTOM_RANGE

  return (
    <input
      aria-label={label}
      inputMode="numeric"
      className="h-8 w-full min-w-0 rounded-full bg-background px-3 text-center text-sm tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      value={draft ?? value}
      onChange={(event) => {
        setDraft(event.target.value)
        const typed = Number(event.target.value)
        if (typed >= min && typed <= max) onChange(typed)
      }}
      onBlur={() => {
        const typed = Number(draft)
        if (draft !== null && typed > 0) onChange(typed)
        setDraft(null)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}

const CustomSize = () => {
  const size = useApp((app) => app.customSize)
  const setCustomSize = useApp((app) => app.setCustomSize)

  return (
    <div className="flex items-center gap-2 text-sm">
      <SideInput
        label="Width in pixels"
        value={size.width}
        onChange={(width) => setCustomSize({ ...size, width })}
      />
      <span className="text-muted-foreground">×</span>
      <SideInput
        label="Height in pixels"
        value={size.height}
        onChange={(height) => setCustomSize({ ...size, height })}
      />
      <span className="text-muted-foreground">px</span>
    </div>
  )
}

const Density = () => {
  const design = useApp((app) => app.design)
  const across = useApp((app) => (app.layout === 'tile' ? null : app.across[app.layout]))
  const stepAcross = useApp((app) => app.stepAcross)

  if (across === null) {
    const [wide, high] = repeatBlock(design)
    return (
      <p className="text-sm text-muted-foreground">
        The smallest piece that repeats{wide * high > 1 && `, ${wide} × ${high} tiles`}. Copies of
        it join up without a seam, at any size.
      </p>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">Tiles across</span>
      <div className="flex items-center gap-1 rounded-full bg-background p-0.5">
        <Tip text="Fewer, bigger tiles">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Fewer tiles across"
            disabled={across <= 1}
            onClick={() => stepAcross(-1)}
          >
            <MinusIcon />
          </Button>
        </Tip>
        <span className="min-w-8 text-center text-sm tabular-nums" aria-live="polite">
          {across}
        </span>
        <Tip text="More, smaller tiles">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="More tiles across"
            disabled={across >= 16}
            onClick={() => stepAcross(1)}
          >
            <PlusIcon />
          </Button>
        </Tip>
      </div>
    </div>
  )
}

export const SaveView = () => {
  const design = useApp((app) => app.design)
  const layout = useApp((app) => app.layout)
  const across = useApp((app) => acrossFor(app.layout, app.across))
  const customSize = useApp((app) => app.customSize)
  const saves = useApp((app) => app.saves)
  const message = useApp((app) => app.hint)
  const closeSave = useApp((app) => app.closeSave)
  const { save, canvas, motion: springs } = useTuning()
  const reducedMotion = useReducedMotion()

  const [areaRef, area] = useElementSize()
  const frame = outputFrame(design, layout, across, customSize)
  const box = area && fit(area, frame.width / frame.height, save.previewFill)
  const src = usePatternImage(design, frame, box)
  const pixels = outputSize(design, layout, customSize)

  const [busy, setBusy] = useState<FileKind | null>(null)
  const saveAs = async (kind: FileKind) => {
    setBusy(kind)
    await savePattern(kind)
    setBusy(null)
  }

  useEffect(() => {
    // Capture phase, or the canvas underneath would deselect too
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      closeSave()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [closeSave])

  return (
    <motion.section
      aria-label="Save"
      className="absolute inset-0 z-20 bg-background p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={toTransition(springs.focus)}
    >
      <div className="grid h-full grid-rows-[minmax(0,1fr)_auto] gap-3 rounded-3xl bg-muted p-3 md:grid-cols-[minmax(0,1fr)_19rem] md:grid-rows-1">
        <div className="flex min-h-56 flex-col items-center justify-center gap-1">
          {/* Measured to fit the preview, so the preview can't size it. */}
          <div ref={areaRef} className="relative min-h-0 w-full flex-1">
            <div className="absolute inset-0 flex items-center justify-center">
              {box && (
                <motion.div
                  className="relative overflow-hidden rounded-md bg-muted-foreground/15 shadow-xl ring-1 ring-foreground/10"
                  initial={{ ...box, scale: 0.96 }}
                  animate={{ ...box, scale: 1 }}
                  transition={toTransition(springs.previewMorph)}
                >
                  {src && (
                    <img
                      src={src}
                      alt={`Your pattern as ${LAYOUTS[layout].label.toLowerCase()}`}
                      className="block size-full object-cover"
                      draggable={false}
                    />
                  )}
                  {/* A new key restarts the flash */}
                  {saves > 0 && !reducedMotion && (
                    <motion.div
                      key={saves}
                      className="pointer-events-none absolute inset-0 bg-white"
                      initial={{ opacity: canvas.saveFlash }}
                      animate={{ opacity: 0 }}
                      transition={toTransition(springs.saveFlash)}
                    />
                  )}
                </motion.div>
              )}
            </div>
          </div>
          <div className="flex h-8 items-center justify-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={message ?? 'size'}
                className={
                  message
                    ? 'w-max max-w-full truncate rounded-full bg-foreground px-3 py-1.5 text-sm text-background'
                    : 'text-xs text-muted-foreground tabular-nums'
                }
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{
                  ...toTransition(springs.press),
                  opacity: toTransition(springs.focus),
                }}
              >
                {message ?? `${pixels.width} × ${pixels.height} px`}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex max-h-full min-h-0 flex-col gap-5 self-start overflow-y-auto rounded-2xl bg-background/60 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Save</h2>
            <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={closeSave}>
              <XIcon />
            </Button>
          </div>

          <div className="-mx-1 grid grid-cols-3 gap-1">
            {LAYOUT_IDS.map((id) => (
              <LayoutChoice key={id} layout={id} chosen={id === layout} />
            ))}
          </div>

          {layout === 'custom' && <CustomSize />}

          <Density />

          <div className="mt-1 flex flex-col gap-2">
            <Button disabled={busy !== null} onClick={() => saveAs('png')}>
              {busy === 'png' ? 'Saving…' : 'Save PNG'}
            </Button>
            <Tip text="A vector file, sharp at any size">
              <Button variant="outline" disabled={busy !== null} onClick={() => saveAs('svg')}>
                {busy === 'svg' ? 'Saving…' : 'Save SVG'}
              </Button>
            </Tip>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
