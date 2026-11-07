import { useLayoutEffect, useRef, type RefObject } from 'react'
import { animate, useReducedMotion } from 'motion/react'
import { fillsOf } from '@/pattern/model'
import { placeInSlot } from '@/pattern/placement'
import { TEMPLATE_BY_ID } from '@/pattern/templates'
import { useApp } from '@/state/store'
import { useTuning } from '@/tuning/store'
import { toTransition } from '@/tuning/transition'

/** Every copy uses the same slot definitions, so this moves the whole pattern at once. */
export const useSlotFlourish = (svg: RefObject<SVGSVGElement | null>) => {
  const flourish = useApp((app) => app.flourish)
  const reducedMotion = useReducedMotion()
  // What each slot still has to turn, so another press carries on from there
  const turning = useRef(new Map<number, number>())

  useLayoutEffect(() => {
    if (!flourish || reducedMotion) return

    const root = svg.current
    if (!root) return

    const { canvas, motion } = useTuning.getState()
    const { design } = useApp.getState()
    const { slots } = TEMPLATE_BY_ID[design.template]
    const fills = fillsOf(design)
    const partsOf = (k: number) => root.querySelectorAll(`[data-slot="${k}"]`)
    const rest = (k: number) => partsOf(k).forEach((part) => part.removeAttribute('transform'))

    const running = flourish.slots.map((k, order) => {
      const { shape, rotation } = fills[k]
      const here = shape ? placeInSlot(slots[k], shape, rotation) : { ...slots[k], degrees: 0 }
      const { cx, cy } = here
      const write = (rotate: number, scale: number, dx = 0, dy = 0) => {
        const transform = `translate(${cx + dx} ${cy + dy}) rotate(${rotate}) scale(${scale}) translate(${-cx} ${-cy})`
        partsOf(k).forEach((part) => part.setAttribute('transform', transform))
      }
      const timing = {
        delay: order * canvas.fillStagger,
        onComplete: () => {
          turning.current.delete(k)
          rest(k)
        },
      }

      if (flourish.kind === 'rotate' && flourish.from) {
        const { from } = flourish
        const step = (here.degrees - from.degrees + 360) % 360 || 360
        const start = (turning.current.get(k) ?? 0) - step
        const [dx, dy] = [from.cx - cx, from.cy - cy]
        write(start, 1, dx, dy)
        return animate(start, 0, {
          ...toTransition(motion.rotate),
          ...timing,
          onUpdate: (rotate) => {
            turning.current.set(k, rotate)
            // Travels in step with the turn
            write(rotate, 1, dx * (rotate / start), dy * (rotate / start))
          },
        })
      }

      // A dropped shape is already showing, so it's pressed in. Anything else grows in.
      const scaleAt = (progress: number) =>
        flourish.kind === 'drop'
          ? 1 - canvas.dropPress * Math.sin(Math.PI * progress)
          : canvas.dropFrom + (1 - canvas.dropFrom) * progress

      write(0, scaleAt(0))
      return animate(0, 1, {
        ...toTransition(motion.drop),
        ...timing,
        onUpdate: (progress) => write(0, scaleAt(progress)),
      })
    })

    return () => {
      running.forEach((animation) => animation.stop())
      flourish.slots.forEach(rest)
    }
  }, [flourish, reducedMotion, svg])
}
