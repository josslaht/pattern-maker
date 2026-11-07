import { useEffect } from 'react'
import { useReducedMotion } from 'motion/react'
import { useApp } from '@/state/store'
import { useTuning } from '@/tuning/store'

/** Steps the intro along. Reduced motion skips it. */
export const useIntro = () => {
  const intro = useApp((app) => app.intro)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!intro) return
    const { introHold, introFlight, introArrive } = useTuning.getState().canvas
    const seconds = { looking: introHold, flying: introFlight, arriving: introArrive }[intro]
    const timer = setTimeout(useApp.getState().advanceIntro, reducedMotion ? 0 : seconds * 1000)
    return () => clearTimeout(timer)
  }, [intro, reducedMotion])
}
