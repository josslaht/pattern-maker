import { useLayoutEffect, type RefObject } from 'react'
import { animate, useReducedMotion, type AnimationPlaybackControls } from 'motion/react'
import { copyAt, poseOf, poseTransform, tilePosition } from '@/pattern/layout'
import type { Design } from '@/pattern/model'
import { useApp } from '@/state/store'
import { useTuning } from '@/tuning/store'
import { toTransition } from '@/tuning/transition'
import { copiesIn, sized } from './useCopyMotion'

/** The intro fades the stage up, then grows every copy out from the tile, nearest first. */
export const useIntroRipple = (
  svg: RefObject<SVGSVGElement | null>,
  layer: RefObject<HTMLDivElement | null>,
  ready: boolean,
  design: Design,
) => {
  const reducedMotion = useReducedMotion()

  useLayoutEffect(() => {
    const root = svg.current
    if (!ready || !root || reducedMotion || useApp.getState().intro !== 'looking') return
    const { canvas, motion } = useTuning.getState()
    const running: AnimationPlaybackControls[] = []

    if (layer.current) {
      running.push(animate(layer.current, { opacity: [0, 1] }, toTransition(motion.introFade)))
    }

    copiesIn(root).forEach((uses, key) => {
      const [i, j] = key.split(',').map(Number)
      const copy = copyAt(design, i, j)
      if (copy.hidden) return
      const at = tilePosition(design.shift, i, j)
      const write = (size: number) => {
        const transform = poseTransform(at, sized(poseOf(copy), size))
        for (const use of uses) use.setAttribute('transform', transform)
      }
      write(0)
      running.push(
        animate(0, 1, {
          ...toTransition(motion.introCopies),
          delay: Math.hypot(i, j) * canvas.introWave,
          onUpdate: write,
        }),
      )
    })

    return () => running.forEach((animation) => animation.stop())
    // Runs once, when the stage first appears.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])
}
