import { useLayoutEffect, useRef, type RefObject } from 'react'
import { animate, useReducedMotion, type AnimationPlaybackControls } from 'motion/react'
import {
  copyAt,
  copyTransform,
  mod,
  poseOf,
  poseTransform,
  tilePosition,
  type Pose,
} from '@/pattern/layout'
import type { Design, Shift } from '@/pattern/model'
import { useTuning } from '@/tuning/store'
import { toTransition } from '@/tuning/transition'

const sized = (pose: Pose, size: number): Pose => ({
  rotate: pose.rotate,
  scaleX: pose.scaleX * size,
  scaleY: pose.scaleY * size,
})

/**
 * React has already drawn the copies in their new arrangement. This starts them from where they
 * were and writes straight to the SVG while they move.
 */
export const useCopyMotion = (
  svg: RefObject<SVGSVGElement | null>,
  shown: Design,
  shiftOnScreen: RefObject<Shift>,
) => {
  const reducedMotion = useReducedMotion()
  const previous = useRef(shown)
  const latest = useRef(shown)
  latest.current = shown
  const moving = useRef(new Map<string, Pose>())

  const { turn, alternateColours, gaps, shuffle } = shown

  useLayoutEffect(() => {
    const from = previous.current
    previous.current = latest.current

    const root = svg.current
    if (!root) return

    // Each copy is two `use` elements, patches and shapes
    const copies = new Map<string, Element[]>()
    root.querySelectorAll('use[data-copy]').forEach((use) => {
      const key = use.getAttribute('data-copy')!
      copies.set(key, [...(copies.get(key) ?? []), use])
    })

    const rest = (uses: Element[], i: number, j: number) => {
      moving.current.delete(`${i},${j}`)
      const design = { ...latest.current, shift: shiftOnScreen.current }
      // Not `after`: a new shuffle can interrupt this
      const hidden = copyAt(latest.current, i, j).hidden
      for (const use of uses) {
        use.removeAttribute('data-turning')
        use.setAttribute('transform', copyTransform(design, i, j))
        if (hidden) use.setAttribute('visibility', 'hidden')
        else use.removeAttribute('visibility')
      }
    }

    const { canvas, motion } = useTuning.getState()
    const running: AnimationPlaybackControls[] = []

    copies.forEach((uses, key) => {
      const [i, j] = key.split(',').map(Number)
      const midway = moving.current.get(key)

      if (reducedMotion) {
        if (midway) rest(uses, i, j)
        return
      }

      const before = copyAt(from, i, j)
      const after = copyAt(latest.current, i, j)
      if (!midway && before.hidden && after.hidden) return

      const was = poseOf(before.hidden ? after : before)
      const next = poseOf(after)
      const moves =
        was.rotate !== next.rotate || was.scaleX !== next.scaleX || was.scaleY !== next.scaleY
      const recolours = before.inks.join() !== after.inks.join()
      if (!midway && !moves && !recolours && before.hidden === after.hidden) return

      const startSize = before.hidden ? 0 : after.hidden || moves ? 1 : canvas.copyPop
      const start = midway ?? sized(was, startSize)
      const end = after.hidden ? sized(start, 0) : next
      const turnBy = after.hidden ? 0 : mod(end.rotate - start.rotate + 180, 360) - 180

      const write = (spring: number) => {
        // Don't overshoot, or a shrinking tile comes back inside out
        const progress = after.hidden ? Math.min(spring, 1) : spring
        const pose = {
          rotate: start.rotate + turnBy * progress,
          scaleX: start.scaleX + (end.scaleX - start.scaleX) * progress,
          scaleY: start.scaleY + (end.scaleY - start.scaleY) * progress,
        }
        moving.current.set(key, pose)
        const transform = poseTransform(tilePosition(shiftOnScreen.current, i, j), pose)
        for (const use of uses) use.setAttribute('transform', transform)
      }

      for (const use of uses) {
        if (after.hidden) use.removeAttribute('visibility')
        use.setAttribute('data-turning', '')
      }
      write(0)
      running.push(
        animate(0, 1, {
          ...toTransition(motion.copies),
          delay: Math.hypot(i, j) * canvas.copyWave,
          onUpdate: write,
          onComplete: () => rest(uses, i, j),
        }),
      )
    })

    return () => running.forEach((animation) => animation.stop())
    // Reads the design through `latest`, so a moving shift doesn't restart it.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, alternateColours, gaps, shuffle, reducedMotion, svg, shiftOnScreen])
}
