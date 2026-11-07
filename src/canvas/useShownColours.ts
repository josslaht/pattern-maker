import { useLayoutEffect, useRef } from 'react'
import { mix } from 'motion'
import { animate } from 'motion/react'
import { useTuning } from '@/tuning/store'
import { toTransition } from '@/tuning/transition'

export const inkVar = (ink: number) => `var(--ink-${ink})`

export const SHOWN_INKS = [0, 1, 2, 3, 4].map(inkVar)

const paint = (colours: string[]) => {
  colours.forEach((colour, ink) => {
    document.documentElement.style.setProperty(`--ink-${ink}`, colour)
  })
}

/**
 * The palette as CSS variables, so the canvas and the dots agree and a mood change doesn't redraw
 * the pattern. Editing one colour follows the picker with no lag.
 */
export const useShownColours = (colours: string[]) => {
  const latest = useRef(colours)

  useLayoutEffect(() => {
    const from = latest.current
    const isOneEdit = colours.filter((to, ink) => to !== from[ink]).length <= 1

    if (isOneEdit) {
      latest.current = colours
      paint(colours)
      return
    }

    const mixers = colours.map((to, ink) => mix(from[ink], to))
    const running = animate(0, 1, {
      ...toTransition(useTuning.getState().motion.recolour),
      onUpdate: (progress) => {
        latest.current = mixers.map((mixer) => mixer(progress))
        paint(latest.current)
      },
      // Ends on the exact colours, not what mixing rounds to
      onComplete: () => {
        latest.current = colours
        paint(colours)
      },
    })

    return () => running.stop()
  }, [colours])
}
