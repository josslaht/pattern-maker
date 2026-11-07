import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { useApp } from '@/state/store'
import { useTuning } from '@/tuning/store'
import { toTransition } from '@/tuning/transition'
import { isTyping } from './isTyping'
import { TileBar } from './TileBar'

const useSelectionKeys = () => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      if (isTyping(event.target) && event.key !== 'Escape') return
      const { selected, drawer, drag, view, deselect, rotateSelected, removeSelected } =
        useApp.getState()
      if (drag || view !== 'tile' || (!selected && !drawer)) return

      if (event.key === 'Escape') deselect()
      else if (event.key === 'r' || event.key === 'R') rotateSelected()
      else if (event.key === 'Delete' || event.key === 'Backspace') removeSelected()
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

/** Under the tile, or docked at the bottom on a phone. `tileBottom` is in px from the stage's top. */
export const TileControls = ({
  visible,
  tileBottom,
  phone,
}: {
  visible: boolean
  tileBottom: number
  phone: boolean
}) => {
  const { barGap, barSlide } = useTuning((tuning) => tuning.canvas)
  const { panel, focus } = useTuning((tuning) => tuning.motion)
  const peeking = useApp((app) => app.peeking)
  useSelectionKeys()

  // Slides towards the edge it came from
  const leaving = { opacity: 0, scale: 0.96, y: phone ? barSlide : -barSlide }
  // Peeking just fades, without the slide
  const variants = {
    shown: { opacity: 1, scale: 1, y: 0 },
    gone: (peek: boolean) => (peek ? { opacity: 0, transition: toTransition(focus) } : leaving),
  }

  return (
    <AnimatePresence initial={false} custom={peeking}>
      {visible && (
        <div
          key="below"
          className={cn(
            'pointer-events-none absolute inset-x-2 flex justify-center bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))]',
            // Docked, it grows upwards, but never over the header
            phone ? 'top-[calc(4rem+env(safe-area-inset-top,0px))] items-end' : 'items-start',
          )}
          // Down to the bottom of the frame, so an open drawer can't run off it
          style={phone ? undefined : { top: tileBottom + barGap }}
        >
          <motion.div
            className="pointer-events-auto flex max-h-full max-w-full"
            variants={variants}
            custom={peeking}
            initial="gone"
            animate="shown"
            exit="gone"
            transition={toTransition(panel)}
          >
            <TileBar />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
