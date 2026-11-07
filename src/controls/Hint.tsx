import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { nextHint, type HintId } from '@/pattern/hints'
import { useApp } from '@/state/store'
import { useTuning } from '@/tuning/store'
import { toTransition } from '@/tuning/transition'

const HINTS: Record<HintId, ReactNode> = {
  tile: 'Drag in a shape, or try a different layout from Tile.',
  colour: 'Pick a colour to paint it, or try out different palettes from Moods.',
  look: (
    <>
      <span className="pointer-coarse:hidden">
        Tap Space or use the buttons above to see the whole pattern. Or hold Space to preview it.
      </span>
      <span className="hidden pointer-coarse:inline">
        Use the buttons above to see the whole pattern.
      </span>
    </>
  ),
  shift: 'Play around with the options below to change how the pattern repeats.',
  save: 'Press Save to download your pattern when you’re done.',
}

export const Hint = ({ at }: { at: 'canvas' | 'save' }) => {
  const message = useApp((app) => (at === 'canvas' ? app.hint : null))
  const lookAfter = useTuning((tuning) => tuning.canvas.lookHintAfter)
  const saveFor = useTuning((tuning) => tuning.canvas.saveHintFor)
  const next = useApp((app) => {
    const id = nextHint(app.learned, app.view, app.selected, lookAfter, saveFor)
    return (id === 'save') === (at === 'save') ? id : null
  })
  const { focus, press } = useTuning((tuning) => tuning.motion)
  const key = message ?? next

  return (
    <AnimatePresence mode="wait" initial={false}>
      {key && (
        <motion.p
          key={key}
          className={cn(
            'pointer-events-none w-max max-w-full bg-foreground px-3 py-1.5 text-center text-sm text-background shadow-md',
            at === 'save' ? 'rounded-full whitespace-nowrap' : 'rounded-2xl',
          )}
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ ...toTransition(press), opacity: toTransition(focus) }}
        >
          {message ?? (next && HINTS[next])}
        </motion.p>
      )}
    </AnimatePresence>
  )
}
