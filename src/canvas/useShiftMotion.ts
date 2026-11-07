import { useLayoutEffect, useRef, type RefObject } from 'react'
import { animate, useReducedMotion, type AnimationPlaybackControls } from 'motion/react'
import { copyTransform, mod } from '@/pattern/layout'
import type { Design, Shift } from '@/pattern/model'
import { useTuning } from '@/tuning/store'
import { toTransition } from '@/tuning/transition'

/** Changing axis goes through zero, so rows and columns never mix. Returns the shift on screen. */
export const useShiftMotion = (svg: RefObject<SVGSVGElement | null>, shown: Design) => {
  const reducedMotion = useReducedMotion()
  const onScreen = useRef(shown.shift)
  const latest = useRef(shown)

  useLayoutEffect(() => {
    latest.current = shown
  })

  const { axis, amount } = shown.shift

  useLayoutEffect(() => {
    const from = onScreen.current
    const root = svg.current
    if (reducedMotion || !root) {
      onScreen.current = { axis, amount }
      return
    }
    if (from.axis === axis && from.amount === amount) return

    const copies = [...root.querySelectorAll('use[data-copy]')].map((use) => {
      const [i, j] = use.getAttribute('data-copy')!.split(',').map(Number)
      return { use, i, j }
    })

    const place = (list: typeof copies) => {
      const design = { ...latest.current, shift: onScreen.current }
      for (const { use, i, j } of list) {
        // A turning copy places itself, from `onScreen`
        if (use.hasAttribute('data-turning')) continue
        use.setAttribute('transform', copyTransform(design, i, j))
      }
    }

    let running: AnimationPlaybackControls | null = null
    const transition = toTransition(useTuning.getState().motion.snap)

    const move = (moving: Shift['axis'], start: number, end: number, then?: () => void) => {
      const list = copies.filter(({ i, j }) => mod(moving === 'rows' ? j : i, 2) === 1)
      running = animate(start, end, {
        ...transition,
        onUpdate: (now) => {
          onScreen.current = { axis: moving, amount: now }
          place(list)
        },
        onComplete: then,
      })
    }

    place(copies)

    if (from.axis === axis || from.amount === 0) {
      move(axis, from.amount, amount)
    } else {
      move(from.axis, from.amount, 0, () => move(axis, 0, amount))
    }

    return () => running?.stop()
  }, [axis, amount, reducedMotion, svg])

  return onScreen
}
