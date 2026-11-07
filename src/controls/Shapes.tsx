import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { RotateCwIcon, Trash2Icon } from 'lucide-react'
import { useTrayPixels } from '@/canvas/DragLayer'
import { useDragPress } from '@/canvas/useDragPress'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { slotOf } from '@/pattern/colours'
import { fillsOf } from '@/pattern/model'
import { SHAPE_BY_ID, SHAPES, type Shape } from '@/pattern/shapes'
import { useApp } from '@/state/store'
import { useTuning } from '@/tuning/store'
import { toTransition } from '@/tuning/transition'
import { Tip } from './Tip'

const TrayShape = ({ shape }: { shape: Shape }) => {
  const { press, focus } = useTuning((tuning) => tuning.motion)
  const { hoverScale, pressScale } = useTuning((tuning) => tuning.canvas)
  const lifted = useApp(
    ({ drag }) => drag?.carried.kind === 'shape' && drag.carried.shape === shape.id,
  )
  const inSelected = useApp(({ design, selected }) => {
    const slot = slotOf(selected)
    return slot !== null && fillsOf(design)[slot]?.shape === shape.id
  })
  const px = useTrayPixels(shape.id)
  const { x, y, side } = shape.box
  const { onPointerDown, wasDragged } = useDragPress({ kind: 'shape', shape: shape.id })

  const onClick = () => {
    if (wasDragged.current) return
    const { selected, placeInSelected, showHint } = useApp.getState()
    if (slotOf(selected) === null) {
      showHint('Drag a shape onto the tile, or select a slot first.')
    } else placeInSelected(shape.id)
  }

  return (
    <Tip text={shape.name}>
      <motion.button
        type="button"
        aria-label={shape.name}
        aria-pressed={inSelected}
        className={cn(
          'grid size-10 shrink-0 cursor-grab touch-none place-items-center rounded-(--bar-inner) text-foreground transition-colours select-none hover:bg-muted',
          inSelected && 'bg-muted',
        )}
        animate={{ opacity: lifted ? 0.3 : 1 }}
        whileHover={{ scale: hoverScale }}
        whileTap={{ scale: pressScale }}
        transition={{ ...toTransition(press), opacity: toTransition(focus) }}
        onPointerDown={onPointerDown}
        onClick={onClick}
      >
        <svg
          viewBox={`${x} ${y} ${side} ${side}`}
          fill="currentColor"
          width={px}
          height={px}
          className="overflow-visible"
          dangerouslySetInnerHTML={{ __html: shape.body }}
        />
      </motion.button>
    </Tip>
  )
}

/** As tall as the tile drawer, so switching between them doesn't move the bar. */
export const ShapesDrawer = () => {
  const shapeSize = useApp((app) => app.design.shapeSize)
  const setShapeSize = useApp((app) => app.setShapeSize)
  const { shapeSizeMin, shapeSizeMax } = useTuning((tuning) => tuning.canvas)
  const percent = Math.round(((shapeSize - shapeSizeMin) / (shapeSizeMax - shapeSizeMin)) * 100)

  return (
    // Fits the shapes row, so the slider spans the shapes above it
    <div className="mx-auto flex w-fit max-w-full flex-col">
      <div className="flex flex-wrap justify-center">
        {SHAPES.map((shape) => (
          <TrayShape key={shape.id} shape={shape} />
        ))}
      </div>
      <label className="flex h-8 items-center gap-3 px-2 text-sm">
        Size
        <span className="min-w-0 flex-1">
          <Slider
            aria-label="Shape size"
            min={shapeSizeMin}
            max={shapeSizeMax}
            step={0.01}
            value={[shapeSize]}
            onValueChange={(value) => setShapeSize(Array.isArray(value) ? value[0] : value)}
          />
        </span>
        <span className="w-9 text-right text-muted-foreground tabular-nums">{percent}%</span>
      </label>
    </div>
  )
}

const ShapeAction = ({
  active,
  label,
  title,
  onClick,
  children,
}: {
  active: boolean
  label: string
  title: string
  onClick: () => void
  children: ReactNode
}) => {
  const press = useTuning((tuning) => tuning.motion.press)
  const actionRest = useTuning((tuning) => tuning.canvas.actionRest)

  // Tip on a wrapper, as disabled buttons get no pointer events
  return (
    <Tip text={title} side="bottom">
      <motion.span
        className="inline-flex"
        initial={false}
        animate={{ scale: active ? 1 : actionRest }}
        transition={toTransition(press)}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          disabled={!active}
          onClick={onClick}
        >
          {children}
        </Button>
      </motion.span>
    </Tip>
  )
}

/** Always there, so waking up doesn't slide the colours away. */
export const ShapeActions = () => {
  const shape = useApp(({ design, selected }) => {
    const slot = slotOf(selected)
    if (slot === null) return null
    const id = fillsOf(design)[slot]?.shape
    return id ? SHAPE_BY_ID[id] : null
  })
  const { rotateSelected, removeSelected } = useApp.getState()

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <span className="mx-2.5 h-5 w-px shrink-0 bg-border max-md:hidden" />
      <ShapeAction
        active={shape !== null && shape.rotations > 1}
        label="Rotate"
        title="Rotate (R)"
        onClick={rotateSelected}
      >
        <RotateCwIcon className="size-5" />
      </ShapeAction>
      <ShapeAction
        active={shape !== null}
        label="Remove shape"
        title="Remove shape"
        onClick={removeSelected}
      >
        <Trash2Icon className="size-5" />
      </ShapeAction>
    </div>
  )
}
