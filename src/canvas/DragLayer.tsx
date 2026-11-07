import { useState, type ReactNode } from 'react'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
  type SpringOptions,
} from 'motion/react'
import { fitToSlot, SHAPE_BY_ID, type ShapeId } from '@/pattern/shapes'
import { DEFAULT_SHAPE_SIZE } from '@/pattern/samples'
import { useApp, type Landing } from '@/state/store'
import { useTuning } from '@/tuning/store'
import { toTransition } from '@/tuning/transition'
import { pointer } from './pointer'
import { inkVar } from './useShownColours'

export const useTrayPixels = (shape: ShapeId) => {
  const trayShape = useTuning((tuning) => tuning.canvas.trayShape)
  const optical = useTuning((tuning) => tuning.optical[shape])
  return trayShape * fitToSlot(DEFAULT_SHAPE_SIZE, optical)
}

const Held = ({
  px,
  landing,
  children,
}: {
  px: number
  landing: Landing | null
  children: ReactNode
}) => {
  const { dragLift, dragLiftOverTarget, dragOpacityOverTarget, dragTilt } = useTuning(
    (tuning) => tuning.canvas,
  )
  const { pickUp, drop, focus } = useTuning((tuning) => tuning.motion)
  const over = useApp((app) => app.target !== null)
  const reducedMotion = useReducedMotion()

  // Starts where it was in the tray and catches up with the pointer
  const [grabbedAt] = useState(() => {
    const origin = useApp.getState().drag?.origin
    return origin
      ? { x: origin.x - pointer.x.get(), y: origin.y - pointer.y.get() }
      : { x: 0, y: 0 }
  })

  const lean = useTransform(useVelocity(pointer.x), [-2000, 2000], [-dragTilt, dragTilt])
  const rotate = useSpring(lean, toTransition(pickUp) as SpringOptions)

  return (
    <motion.div
      className="pointer-events-none fixed top-0 left-0 z-50 text-foreground drop-shadow-md"
      style={{
        x: pointer.x,
        y: pointer.y,
        rotate: reducedMotion ? 0 : rotate,
        marginLeft: -px / 2,
        marginTop: -px / 2,
      }}
      initial={{ scale: 1, opacity: 1 }}
      animate={{
        scale: over ? dragLiftOverTarget : dragLift,
        opacity: over ? dragOpacityOverTarget : 1,
      }}
      transition={{ ...toTransition(pickUp), opacity: toTransition(focus) }}
      custom={landing}
      variants={{
        away: (to: Landing) => ({
          ...to,
          transition: { ...toTransition(drop), opacity: toTransition(focus) },
        }),
      }}
      exit="away"
    >
      <motion.div initial={grabbedAt} animate={{ x: 0, y: 0 }} transition={toTransition(pickUp)}>
        {children}
      </motion.div>
    </motion.div>
  )
}

const HeldShape = ({ shape, landing }: { shape: ShapeId; landing: Landing | null }) => {
  const px = useTrayPixels(shape)
  const { box, body } = SHAPE_BY_ID[shape]
  return (
    <Held px={px} landing={landing}>
      <svg
        viewBox={`${box.x} ${box.y} ${box.side} ${box.side}`}
        fill="currentColor"
        width={px}
        height={px}
        className="block overflow-visible"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </Held>
  )
}

const HeldColour = ({ ink, landing }: { ink: number; landing: Landing | null }) => {
  const px = useTuning((tuning) => tuning.canvas.colourCarried)
  return (
    <Held px={px} landing={landing}>
      <div
        className="rounded-full ring-2 ring-background"
        style={{ width: px, height: px, backgroundColor: inkVar(ink) }}
      />
    </Held>
  )
}

export const DragLayer = () => {
  const carried = useApp((app) => app.drag?.carried)
  const landing = useApp((app) => app.landing)
  const label = useApp((app) => app.cursorLabel)
  const { press, focus } = useTuning((tuning) => tuning.motion)
  const labelFrom = useTuning((tuning) => tuning.canvas.labelFrom)

  return (
    <>
      <AnimatePresence custom={landing}>
        {carried?.kind === 'shape' && (
          <HeldShape key="carried" shape={carried.shape} landing={landing} />
        )}
        {carried?.kind === 'colour' && (
          <HeldColour key="carried" ink={carried.ink} landing={landing} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {label && (
          <motion.div
            className="pointer-events-none fixed top-0 left-0 z-50"
            style={{ x: pointer.x, y: pointer.y }}
          >
            <motion.p
              className="mt-5 ml-4 w-max origin-top-left rounded-full bg-foreground px-2.5 py-1 text-xs text-background shadow-sm"
              initial={{ opacity: 0, scale: labelFrom }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: labelFrom }}
              transition={{ ...toTransition(press), opacity: toTransition(focus) }}
            >
              {label}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
