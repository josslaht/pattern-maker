import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Hint } from '@/controls/Hint'
import { PatternControls } from '@/controls/PatternBar'
import { TileControls } from '@/controls/TileControls'
import { cn } from '@/lib/utils'
import { ANGLE, centredCamera, coverRange, visibleRect } from '@/pattern/camera'
import { applyDrop } from '@/pattern/colours'
import { useApp } from '@/state/store'
import { useTuning } from '@/tuning/store'
import { toTransition } from '@/tuning/transition'
import { IDENTITY_INKS, PatternCopies, TileArt } from './PatternArt'
import { SlotOutlines } from './SlotOutlines'
import { useDrop, usePatternPress } from './useCanvasPointer'
import { useCopyMotion } from './useCopyMotion'
import { useShiftMotion } from './useShiftMotion'
import { SHOWN_INKS, useShownColours } from './useShownColours'
import { useIntro } from './useIntro'
import { useSlotFlourish } from './useSlotFlourish'
import { useStageMotion, type Layout, type StageTarget } from './useStageMotion'

const STAGE_RADIUS = 24

const useLayout = () => {
  const stageRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<Layout | null>(null)

  useEffect(() => {
    const stage = stageRef.current
    const layer = layerRef.current
    if (!stage || !layer) return
    const measure = () => {
      const box = stage.getBoundingClientRect()
      const screen = layer.getBoundingClientRect()
      const next: Layout = {
        window: { width: screen.width, height: screen.height },
        stage: {
          x: box.left - screen.left,
          y: box.top - screen.top,
          width: box.width,
          height: box.height,
        },
        radius: STAGE_RADIUS,
      }
      // A new layout snaps the camera, so keep the old one unless something moved
      setLayout((last) => (JSON.stringify(last) === JSON.stringify(next) ? last : next))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    observer.observe(layer)
    return () => observer.disconnect()
  }, [])

  return { stageRef, layerRef, layout }
}

/** Tap Space to switch views, hold it to peek. Nothing hides until it's held past a tap. */
const useSpaceKey = () => {
  useEffect(() => {
    const setPeeking = (peeking: boolean) => useApp.getState().setPeeking(peeking)

    // A clicked button keeps focus and would take Space as a press. Only Tab hands it over.
    let tabbing = false
    const noticeKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab') tabbing = true
    }
    const noticePointer = () => {
      tabbing = false
    }

    const wantsSpace = (target: EventTarget | null) =>
      target instanceof Element &&
      target !== document.body &&
      (tabbing || target.closest('input:not([type="range"]), textarea, [role="listbox"]') !== null)

    let pressed = false
    let peekTimer: number | undefined

    const down = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || wantsSpace(event.target)) return
      event.preventDefault()
      const { drag, intro } = useApp.getState()
      if (event.repeat || drag || intro) return
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      pressed = true
      const tap = useTuning.getState().canvas.spaceTap
      peekTimer = window.setTimeout(() => setPeeking(true), tap * 1000)
    }
    const up = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || !pressed) return
      event.preventDefault()
      pressed = false
      window.clearTimeout(peekTimer)
      if (!useApp.getState().peeking) {
        const { view, setView } = useApp.getState()
        setView(view === 'tile' ? 'pattern' : 'tile')
      }
      setPeeking(false)
    }
    const release = () => {
      pressed = false
      window.clearTimeout(peekTimer)
      setPeeking(false)
    }

    window.addEventListener('keydown', noticeKey)
    window.addEventListener('pointerdown', noticePointer, true)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('keydown', noticeKey)
      window.removeEventListener('pointerdown', noticePointer, true)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', release)
      window.clearTimeout(peekTimer)
    }
  }, [])
}

export const Canvas = () => {
  const design = useApp((app) => app.design)
  const view = useApp((app) => app.view)
  const selected = useApp((app) => app.selected)
  const drag = useApp((app) => app.drag)
  const dropTarget = useApp((app) => app.target)
  const saves = useApp((app) => app.saves)
  const intro = useApp((app) => app.intro)
  const peeking = useApp((app) => app.peeking)
  const toolsOut = intro === null || intro === 'arriving'

  const { canvas, optical, motion: springs } = useTuning()
  const { tileShare, patternShare, bleed, saveFlash } = canvas
  const reducedMotion = useReducedMotion()

  const { stageRef, layerRef, layout } = useLayout()
  const viewport = layout?.stage ?? null
  useSpaceKey()
  const svg = useRef<SVGSVGElement>(null)
  useIntro()

  // The intro opens on the whole pattern, as if Space were held
  const showsPattern = view === 'pattern' || intro === 'looking'
  const opened = peeking || intro === 'looking'

  const { target, range } = useMemo(() => {
    const stage = layout?.stage ?? { x: 0, y: 0, width: 1, height: 1 }
    const screen = layout?.window ?? stage
    const tile = centredCamera(stage, tileShare)
    const pattern = centredCamera(stage, patternShare, design.angled ? ANGLE : 0)
    const goal: StageTarget = showsPattern
      ? { camera: pattern, output: 1 }
      : { camera: tile, output: 0 }
    return {
      target: goal,
      // Covers both ends of the camera move, and the turn between them
      range: coverRange([
        visibleRect(screen, stage, tile),
        visibleRect(screen, stage, pattern),
        visibleRect(screen, stage, { ...pattern, angle: 0 }),
      ]),
    }
  }, [layout, tileShare, patternShare, showsPattern, design.angled])

  useShownColours(design.colours)

  const shown = useMemo(() => {
    const current = { ...design, colours: SHOWN_INKS }
    return drag && dropTarget ? applyDrop(current, drag.carried, dropTarget) : current
  }, [design, drag, dropTarget])

  const { world, fade, master, outlines, conversions } = useStageMotion(
    target,
    layout,
    layerRef,
    !opened,
    drag !== null,
    saves,
  )

  const press = usePatternPress(conversions, shown)
  useDrop(conversions, shown)
  useSlotFlourish(svg)
  const shiftOnScreen = useShiftMotion(svg, shown)
  useCopyMotion(svg, shown, shiftOnScreen)

  return (
    <div ref={stageRef} className="relative h-full min-h-0 select-none">
      {/* Covers the window, clipped to the stage until Space opens it out. */}
      <div ref={layerRef} className={cn('fixed inset-0 bg-muted', !layout && 'invisible')}>
        {layout && (
          <svg
            ref={svg}
            className={cn(
              'absolute inset-0 block size-full',
              'touch-none',
              intro && 'pointer-events-none',
            )}
            width={layout.window.width}
            height={layout.window.height}
            aria-label="Your pattern"
            role="img"
            {...press.handlers}
          >
            <g ref={world}>
              <PatternCopies design={shown} optical={optical} bleed={bleed} range={range} />

              <rect
                ref={fade}
                x={range.i0}
                y={range.j0}
                width={range.i1 - range.i0 + 1}
                height={range.j1 - range.j0 + 1}
                fill={shown.colours[shown.background]}
              />

              {/* The master stays upright whatever the copies do. */}
              <g ref={master}>
                <rect width={1} height={1} fill={shown.colours[shown.background]} />
                <TileArt design={shown} optical={optical} bleed={bleed} inks={IDENTITY_INKS} />
                <rect
                  width={1}
                  height={1}
                  fill="none"
                  stroke="white"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
                <rect
                  width={1}
                  height={1}
                  fill="none"
                  stroke="black"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  vectorEffect="non-scaling-stroke"
                />
              </g>

              <g ref={outlines}>
                <SlotOutlines
                  design={shown}
                  selected={selected}
                  target={dropTarget}
                  hover={press.hover}
                />
              </g>

              {/* A new key restarts the flash */}
              {saves > 0 && !reducedMotion && (
                <motion.rect
                  key={saves}
                  x={range.i0}
                  y={range.j0}
                  width={range.i1 - range.i0 + 1}
                  height={range.j1 - range.j0 + 1}
                  className="pointer-events-none"
                  fill="white"
                  initial={{ opacity: saveFlash }}
                  animate={{ opacity: 0 }}
                  transition={toTransition(springs.saveFlash)}
                />
              )}
            </g>
          </svg>
        )}
      </div>

      {viewport && (
        <TileControls
          visible={view === 'tile' && !peeking && toolsOut}
          tilePixels={centredCamera(viewport, tileShare).scale}
        />
      )}

      <PatternControls visible={view === 'pattern' && !peeking} hint={<Hint at="canvas" />} />

      <AnimatePresence initial={false}>
        {viewport && view === 'tile' && !intro && (
          <motion.div
            className="pointer-events-none absolute inset-x-2 flex justify-center"
            style={{
              bottom: `calc(50% + ${centredCamera(viewport, tileShare).scale / 2 + canvas.barGap}px)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: peeking ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={toTransition(springs.focus)}
          >
            <Hint at="canvas" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
