import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { animate, cancelFrame, frame, motionValue, useReducedMotion } from 'motion/react'
import type { Camera, Rect, Size } from '@/pattern/camera'
import type { Point } from '@/pattern/templates'
import { useApp } from '@/state/store'
import { toTransition } from '@/tuning/transition'
import { useTuning } from '@/tuning/store'

export type StageTarget = {
  camera: Camera
  output: number
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** The pattern covers the window and shows through the stage. Holding Space opens the stage out. */
export type Layout = {
  window: Size
  stage: Rect
  radius: number
}

export type StageConversions = {
  toWorld: (clientX: number, clientY: number) => Point
  toScreen: (world: Point) => Point
  isOver: (clientX: number, clientY: number) => boolean
  scale: () => number
}

/** Writes SVG attributes once a frame, so camera moves don't re-render React. */
export const useStageMotion = (
  target: StageTarget,
  layout: Layout | null,
  layer: RefObject<HTMLDivElement | null>,
  focused: boolean,
  dragging: boolean,
  saves: number,
) => {
  const world = useRef<SVGGElement>(null)
  const fade = useRef<SVGRectElement>(null)
  const master = useRef<SVGGElement>(null)
  const outlines = useRef<SVGGElement>(null)

  const [values] = useState(() => ({
    cx: motionValue(0.5),
    cy: motionValue(0.5),
    // Log so zooming out doesn't rush at the wide end
    logScale: motionValue(0),
    output: motionValue(0),
    focus: motionValue(focused ? 1 : 0),
    fade: motionValue(useTuning.getState().canvas.copyFade),
  }))

  const reducedMotion = useReducedMotion()
  const fadeGoal = useTuning((tuning) =>
    dragging ? tuning.canvas.copyFadeWhileDragging : tuning.canvas.copyFade,
  )

  const latest = useRef(layout)
  latest.current = layout

  const [conversions] = useState<StageConversions>(() => {
    const stage = () => {
      const svgRect = world.current?.ownerSVGElement?.getBoundingClientRect()
      const box = latest.current?.stage
      if (!svgRect || !box) return null
      return { ...box, x: svgRect.left + box.x, y: svgRect.top + box.y }
    }
    const scale = () => Math.exp(values.logScale.get())
    return {
      scale,
      toWorld: (clientX, clientY) => {
        const rect = stage()
        if (!rect) return [0, 0]
        return [
          (clientX - rect.x - rect.width / 2) / scale() + values.cx.get(),
          (clientY - rect.y - rect.height / 2) / scale() + values.cy.get(),
        ]
      },
      toScreen: ([x, y]) => {
        const rect = stage()
        if (!rect) return [0, 0]
        return [
          (x - values.cx.get()) * scale() + rect.x + rect.width / 2,
          (y - values.cy.get()) * scale() + rect.y + rect.height / 2,
        ]
      },
      isOver: (clientX, clientY) => {
        const rect = stage()
        if (!rect) return false
        return (
          clientX >= rect.x &&
          clientX <= rect.x + rect.width &&
          clientY >= rect.y &&
          clientY <= rect.y + rect.height
        )
      },
    }
  })

  const [apply] = useState(() => () => {
    const current = latest.current
    if (!current) return
    const { window, stage, radius } = current

    const scale = Math.exp(values.logScale.get())
    const x = stage.x + stage.width / 2 - values.cx.get() * scale
    const y = stage.y + stage.height / 2 - values.cy.get() * scale
    world.current?.setAttribute('transform', `translate(${x} ${y}) scale(${scale})`)

    const focus = clamp01(values.focus.get())
    const top = stage.y * focus
    const right = (window.width - stage.x - stage.width) * focus
    const bottom = (window.height - stage.y - stage.height) * focus
    const left = stage.x * focus
    layer.current?.style.setProperty(
      'clip-path',
      `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius * focus}px)`,
    )

    const output = clamp01(values.output.get())
    const editing = (1 - output) * focus

    fade.current?.setAttribute('opacity', String(editing * values.fade.get()))
    master.current?.setAttribute('opacity', String(editing))
    outlines.current?.setAttribute('opacity', String(editing))
  })

  useEffect(() => {
    const schedule = () => frame.render(apply)
    const unsubscribe = Object.values(values).map((value) => value.on('change', schedule))
    return () => {
      unsubscribe.forEach((stop) => stop())
      cancelFrame(apply)
    }
  }, [apply, values])

  const goals = {
    cx: target.camera.cx,
    cy: target.camera.cy,
    logScale: Math.log(target.camera.scale),
    output: target.output,
  }

  // Resizing the window, or arriving, snaps.
  const lastLayout = useRef<Layout | null>(null)
  const signature = JSON.stringify(goals)

  useLayoutEffect(() => {
    const snap = reducedMotion || lastLayout.current !== layout
    lastLayout.current = layout
    const { camera, intro } = useTuning.getState().motion
    const spring = useApp.getState().intro ? intro : camera

    for (const [key, goal] of Object.entries(goals) as [keyof typeof goals, number][]) {
      if (snap) values[key].jump(goal)
      else animate(values[key], goal, toTransition(spring))
    }
    apply()
    // `goals` is a new object every render.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, layout, reducedMotion, apply, values])

  useEffect(() => {
    if (reducedMotion) return values.focus.jump(focused ? 1 : 0)
    const { focus, intro } = useTuning.getState().motion
    const spring = useApp.getState().intro ? intro : focus
    animate(values.focus, focused ? 1 : 0, toTransition(spring))
  }, [focused, reducedMotion, values])

  // Only fades, so it stays with reduced motion.
  useEffect(() => {
    const { focus } = useTuning.getState().motion
    animate(values.fade, fadeGoal, toTransition(focus))
  }, [fadeGoal, values])

  const scaleGoal = useRef(goals.logScale)
  scaleGoal.current = goals.logScale

  useEffect(() => {
    if (!saves || reducedMotion) return
    const { canvas, motion } = useTuning.getState()
    values.logScale.jump(scaleGoal.current - canvas.saveKick)
    animate(values.logScale, scaleGoal.current, toTransition(motion.saveKick))
  }, [saves, reducedMotion, values])

  return { world, fade, master, outlines, conversions }
}
