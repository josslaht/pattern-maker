import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
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

/** `tilePixels` is the tile's size on screen. */
export const TileControls = ({ visible, tilePixels }: { visible: boolean; tilePixels: number }) => {
  const { barGap, barSlide } = useTuning((tuning) => tuning.canvas)
  const { panel, focus } = useTuning((tuning) => tuning.motion)
  const peeking = useApp((app) => app.peeking)
  const edge = `calc(50% + ${tilePixels / 2 + barGap}px)`
  useSelectionKeys()

  const leaving = { opacity: 0, scale: 0.96, y: -barSlide }
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
          className="pointer-events-none absolute inset-x-2 bottom-3 flex items-start justify-center"
          // Down to the bottom of the frame, so an open drawer can't run off it
          style={{ top: edge }}
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
