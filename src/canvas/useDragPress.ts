import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { Carried } from '@/pattern/colours'
import { useApp } from '@/state/store'
import { trackPointer } from './pointer'

const DRAG_SLOP = 4

/** A click if the pointer stays put, a drag if it moves. `wasDragged` tells the click handler. */
export const useDragPress = (carried: Carried) => {
  const wasDragged = useRef(false)

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    wasDragged.current = false

    const button = event.currentTarget.getBoundingClientRect()
    const home = {
      x: button.left + button.width / 2,
      y: button.top + button.height / 2,
      scale: 1,
      opacity: 1,
    }
    const { clientX, clientY } = event

    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
    const move = (moved: PointerEvent) => {
      if (Math.hypot(moved.clientX - clientX, moved.clientY - clientY) < DRAG_SLOP) return
      stop()
      wasDragged.current = true
      trackPointer(moved)
      useApp.getState().beginDrag(carried, home)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
  }

  return { onPointerDown, wasDragged }
}
