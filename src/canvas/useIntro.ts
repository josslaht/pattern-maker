import { useEffect } from 'react'
import { useReducedMotion } from 'motion/react'
import { useApp } from '@/state/store'
import { useTuning } from '@/tuning/store'

/**
 * Steps the intro along. `ripple` is seconds until the copies reach the frame's corners, and is 0
 * until the frame is measured. Reduced motion skips it.
 */
export const useIntro = (ripple: number) => {
  const intro = useApp((app) => app.intro)
  const reducedMotion = useReducedMotion()
  const measured = ripple > 0

  useEffect(() => {
    if (!intro || (!measured && !reducedMotion)) return
    const { canvas, motion } = useTuning.getState()
    const { introHold, introFlight, introArrive } = canvas
    // The last copies to start still have to grow
    const { introCopies } = motion
    const settle =
      introCopies.type === 'easing' ? introCopies.duration : (introCopies.visualDuration ?? 0)
    const looking = ripple + settle + introHold
    const seconds = { looking, flying: introFlight, arriving: introArrive }[intro]
    const timer = setTimeout(useApp.getState().advanceIntro, reducedMotion ? 0 : seconds * 1000)
    return () => clearTimeout(timer)
    // A resize mid-intro doesn't restart it
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [intro, reducedMotion, measured])
}
