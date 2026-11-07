import { motion } from 'motion/react'
import { useDragPress } from '@/canvas/useDragPress'
import { inkVar } from '@/canvas/useShownColours'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { inkOf, moodOf, slotOf } from '@/pattern/colours'
import { MOODS } from '@/pattern/moods'
import { useApp } from '@/state/store'
import { useTuning } from '@/tuning/store'
import { toTransition } from '@/tuning/transition'
import { ColourPicker } from './ColourPicker'
import { Tip } from './Tip'

const CHOSEN = 'ring-2 ring-foreground ring-offset-2 ring-offset-background'

const Dot = ({ ink }: { ink: number }) => {
  const chosen = useApp(({ design, selected, drawer, editingInk }) =>
    selected ? inkOf(design, selected) === ink : drawer === 'picker' && editingInk === ink,
  )
  const lifted = useApp(({ drag }) => drag?.carried.kind === 'colour' && drag.carried.ink === ink)
  const { press, focus } = useTuning((tuning) => tuning.motion)
  const { hoverScale, pressScale } = useTuning((tuning) => tuning.canvas)
  const { onPointerDown, wasDragged } = useDragPress({ kind: 'colour', ink })

  const onClick = () => {
    if (wasDragged.current) return
    const { selected, paintSelected, editInk } = useApp.getState()
    if (selected) paintSelected(ink)
    else editInk(ink)
  }

  return (
    <motion.button
      type="button"
      aria-label={`Colour ${ink + 1}`}
      aria-pressed={chosen}
      className={cn(
        'size-7 shrink-0 cursor-grab touch-none rounded-full outline-none select-none focus-visible:ring-2 focus-visible:ring-ring',
        chosen ? CHOSEN : 'ring-1 ring-foreground/10 ring-inset',
      )}
      style={{ backgroundColor: inkVar(ink) }}
      initial={false}
      animate={{ opacity: lifted ? 0.3 : 1 }}
      whileHover={{ scale: hoverScale }}
      whileTap={{ scale: pressScale }}
      transition={{ ...toTransition(press), opacity: toTransition(focus) }}
      onPointerDown={onPointerDown}
      onClick={onClick}
    />
  )
}

/** With a slot selected it's that slot's patch. The canvas finds it by data attribute. */
const BackgroundChip = () => {
  const carrying = useApp((app) => app.drag?.carried.kind === 'colour')
  const over = useApp((app) => app.target?.kind === 'background')
  const slot = useApp((app) => slotOf(app.selected))
  const chosen = useApp(
    ({ selected }) => selected?.kind === 'background' || selected?.kind === 'slotBackground',
  )
  const ink = useApp(({ design, drag, target, selected }) => {
    const carried = drag?.carried
    const previewing = carried?.kind === 'colour' && target?.kind === 'background'
    if (previewing) return carried.ink
    const inSlot = slotOf(selected)
    return inSlot === null
      ? design.background
      : inkOf(design, { kind: 'slotBackground', slot: inSlot })
  })
  const select = useApp((app) => app.select)
  const pickUp = useTuning((tuning) => tuning.motion.pickUp)
  const { hoverScale, pressScale } = useTuning((tuning) => tuning.canvas)

  return (
    <Tip
      side="bottom"
      text={
        chosen
          ? null
          : slot === null
            ? 'Click to change background'
            : "Click to change this slot's background"
      }
    >
      <motion.button
        data-background-well
        type="button"
        aria-label="Background"
        aria-pressed={chosen}
        className={cn(
          'ms-1.5 size-7 shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
          chosen || carrying ? CHOSEN : 'ring-1 ring-foreground/20 ring-inset',
        )}
        style={{ backgroundColor: inkVar(ink) }}
        initial={false}
        animate={{ scale: over ? 1.2 : carrying ? 1.08 : 1 }}
        whileHover={{ scale: hoverScale }}
        whileTap={{ scale: pressScale }}
        transition={toTransition(pickUp)}
        onClick={() =>
          select(slot === null ? { kind: 'background' } : { kind: 'slotBackground', slot })
        }
      />
    </Tip>
  )
}

export const ColourDots = () => {
  const colours = useApp((app) => app.design.colours)

  return (
    <div className="flex items-center gap-1.5">
      {colours.map((_, ink) => (
        <Dot key={ink} ink={ink} />
      ))}
      <BackgroundChip />
    </div>
  )
}

export const MoodsDrawer = () => {
  const setMood = useApp((app) => app.setMood)
  const mood = useApp((app) => moodOf(app.design))

  return (
    <ToggleGroup
      className="grid w-full grid-cols-6 gap-1"
      value={mood ? [mood.name] : []}
      onValueChange={([next]) => {
        const chosen = MOODS.find(({ name }) => name === next)
        if (chosen) setMood(chosen.colours)
      }}
    >
      {MOODS.map(({ name, colours: strip }) => (
        <Tip key={name} text={name} side="bottom">
          <ToggleGroupItem
            value={name}
            aria-label={name}
            className="h-auto min-w-0 rounded-(--bar-inner) p-1.5"
          >
            <span className="flex h-5 w-full overflow-hidden rounded-full">
              {strip.map((swatch) => (
                <span key={swatch} className="flex-1" style={{ backgroundColor: swatch }} />
              ))}
            </span>
          </ToggleGroupItem>
        </Tip>
      ))}
    </ToggleGroup>
  )
}

export const PickerDrawer = () => {
  const setColour = useApp((app) => app.setColour)
  const ink = useApp((app) => app.editingInk)
  const colour = useApp((app) => app.design.colours[app.editingInk])

  return <ColourPicker colour={colour} onChange={(next) => setColour(ink, next)} />
}
