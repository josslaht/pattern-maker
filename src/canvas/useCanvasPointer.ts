import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { colourTargetAt, selectionAt, slotOf, type Selection, type Target } from '@/pattern/colours'
import { hitTest } from '@/pattern/drops'
import { selectLabel } from '@/pattern/hints'
import type { Design } from '@/pattern/model'
import { fitToSlot } from '@/pattern/shapes'
import { placeInSlot } from '@/pattern/placement'
import { DEFAULT_SHAPE_SIZE } from '@/pattern/samples'
import { TEMPLATE_BY_ID } from '@/pattern/templates'
import { useApp } from '@/state/store'
import { useTuning } from '@/tuning/store'
import { trackPointer } from './pointer'
import type { StageConversions } from './useStageMotion'

const sameTarget = (a: Target | Selection | null, b: Target | Selection | null) =>
  JSON.stringify(a) === JSON.stringify(b)

/** The chip isn't on the canvas, so it's found through the page. */
const isOverBackgroundWell = (x: number, y: number) =>
  document.elementFromPoint(x, y)?.closest('[data-background-well]') != null

export const useDrop = (stage: StageConversions, shown: Design) => {
  const dragging = useApp((app) => app.drag !== null)

  useEffect(() => {
    if (!dragging) return

    const { aimDrag, dropDrag, cancelDrag } = useApp.getState()

    const targetAt = (x: number, y: number): Target | null => {
      const carried = useApp.getState().drag?.carried
      const isColour = carried?.kind === 'colour'
      if (isColour && isOverBackgroundWell(x, y)) {
        const slot = slotOf(useApp.getState().selected)
        return slot === null ? { kind: 'background' } : { kind: 'background', slot }
      }
      if (!stage.isOver(x, y)) return null

      const { canvas, optical } = useTuning.getState()
      const { edgeBand, shapeZone } = canvas
      return isColour
        ? colourTargetAt(shown, stage.toWorld(x, y), { optical, shapeZone, edgeBand })
        : hitTest(shown, stage.toWorld(x, y), edgeBand)
    }

    const aim = (event: PointerEvent) => {
      trackPointer(event)
      const next = targetAt(event.clientX, event.clientY)
      if (!sameTarget(next, useApp.getState().target)) aimDrag(next)
    }

    const release = (event: PointerEvent) => {
      aim(event)
      const { target, drag } = useApp.getState()
      if (!target || !drag) return cancelDrag()

      const { canvas, optical } = useTuning.getState()
      const { carried } = drag

      if (carried.kind === 'colour') {
        const { clientX: x, clientY: y } = event
        return dropDrag({ x, y, scale: canvas.colourBloom, opacity: 0 })
      }

      if (target.kind !== 'slot') {
        const [x, y] = stage.toScreen([0.5, 0.5])
        return dropDrag({ x, y, scale: 0.6, opacity: 0 })
      }

      const place = placeInSlot(TEMPLATE_BY_ID[shown.template].slots[target.slot], carried.shape, 0)
      const [x, y] = stage.toScreen([place.cx, place.cy])
      const fit = optical[carried.shape]
      const landed = place.size * fitToSlot(shown.shapeSize, fit) * stage.scale()
      const inHand = canvas.trayShape * fitToSlot(DEFAULT_SHAPE_SIZE, fit)
      dropDrag({ x, y, scale: landed / inHand, opacity: 0 })
    }

    const cancel = () => useApp.getState().cancelDrag()
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel()
    }

    window.addEventListener('pointermove', aim)
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', escape)
    document.documentElement.style.cursor = 'grabbing'
    return () => {
      window.removeEventListener('pointermove', aim)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keydown', escape)
      document.documentElement.style.cursor = ''
    }
  }, [dragging, stage, shown])
}

export const usePatternPress = (stage: StageConversions, shown: Design) => {
  const [hover, setHover] = useState<Selection | null>(null)
  const pressed = useRef(false)
  const view = useApp((app) => app.view)

  // After a pause on a slot, say that a click selects it, until one has been clicked.
  useEffect(() => {
    const { selected, learned } = useApp.getState()
    if (!hover || view !== 'tile' || slotOf(hover) === slotOf(selected)) return
    const label = selectLabel(learned)
    if (!label) return

    let showing = false
    const delay = useTuning.getState().canvas.selectLabelDelay
    const timer = setTimeout(() => {
      if (useApp.getState().drag) return
      showing = true
      useApp.getState().setCursorLabel(label)
    }, delay * 1000)
    return () => {
      clearTimeout(timer)
      if (showing) useApp.getState().setCursorLabel(null)
    }
    // `shown` changes as things animate, which should not restart it.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [hover, view])

  const partAt = (event: ReactPointerEvent) =>
    selectionAt(shown, stage.toWorld(event.clientX, event.clientY))

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    trackPointer(event)
    setHover(null)
    pressed.current = true
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (pressed.current) return trackPointer(event)

    const { view, drag } = useApp.getState()
    if (event.pointerType !== 'mouse' || view !== 'tile') return
    trackPointer(event)
    const next = drag ? null : partAt(event)
    if (!sameTarget(next, hover)) setHover(next)
  }

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!pressed.current) return
    pressed.current = false

    const { view, select, deselect } = useApp.getState()
    if (view !== 'tile') return

    const part = partAt(event)
    if (part) select(part)
    else deselect()
  }

  const onPointerCancel = () => {
    pressed.current = false
  }

  const onPointerLeave = () => setHover(null)

  return {
    hover,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerLeave },
  }
}
