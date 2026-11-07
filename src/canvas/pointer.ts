import { motionValue } from 'motion/react'

/** Outside React, so the dragged shape follows the pointer without re-rendering. */
export const pointer = { x: motionValue(0), y: motionValue(0) }

export const trackPointer = (event: { clientX: number; clientY: number }) => {
  pointer.x.set(event.clientX)
  pointer.y.set(event.clientY)
}
