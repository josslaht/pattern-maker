import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { useTuning } from '@/tuning/store'
import { toTransition } from '@/tuning/transition'

/** `radius` is set here in pixels, or Motion doesn't keep the corners round while it stretches. */
export const ChosenPill = ({
  id,
  radius,
  className,
}: {
  id: string
  radius: number
  className: string
}) => {
  const snap = useTuning((tuning) => tuning.motion.snap)

  return (
    <motion.span
      layoutId={id}
      className={cn('absolute', className)}
      style={{ borderRadius: radius }}
      transition={toTransition(snap)}
    />
  )
}
