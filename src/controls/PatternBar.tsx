import { useMemo, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DicesIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import type { ShiftAxis } from '@/pattern/model'
import { TILE_TURNS, usefulVariations } from '@/pattern/variation'
import { useApp } from '@/state/store'
import { useTuning } from '@/tuning/store'
import { toTransition } from '@/tuning/transition'
import { ChosenPill } from './ChosenPill'
import { BAR_SHAPE } from './TileBar'
import { Tip } from './Tip'

const SHIFTS: { id: ShiftAxis; name: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'rows', name: 'Rows' },
  { id: 'cols', name: 'Columns' },
]

const Dice = () => {
  const shuffle = useApp((app) => app.design.shuffle)
  const spring = useTuning((tuning) => tuning.motion.rotate)

  return (
    <motion.span
      className="inline-flex"
      initial={false}
      animate={{ rotate: shuffle * 90 }}
      transition={toTransition(spring)}
    >
      <DicesIcon className="size-3.5" />
    </motion.span>
  )
}

/** Pops in to space that is already reserved, so nothing else moves. */
const PopIn = ({
  shown,
  className,
  children,
}: {
  shown: boolean
  className: string
  children: ReactNode
}) => {
  const { press, focus } = useTuning((tuning) => tuning.motion)

  return (
    <AnimatePresence initial={false}>
      {shown && (
        <motion.span
          className={className}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ ...toTransition(press), opacity: toTransition(focus) }}
        >
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

/** Clicking the chosen `shuffles` option again shuffles it. */
export const Segmented = <Id extends string>({
  label,
  hideLabel,
  options,
  value,
  onChange,
  shuffles,
  onShuffle,
}: {
  label: string
  hideLabel?: boolean
  options: { id: Id; name: string }[]
  value: Id
  onChange: (id: Id) => void
  shuffles?: Id
  onShuffle?: () => void
}) => {
  return (
    <div className={cn('flex items-center justify-between gap-2 text-sm', !hideLabel && 'ps-2')}>
      {!hideLabel && label}
      <ToggleGroup
        aria-label={label}
        spacing={0.5}
        className="rounded-full bg-muted p-0.5"
        value={[value]}
        onValueChange={([next]) => {
          if (next) onChange(next as Id)
          else if (value === shuffles) onShuffle?.()
        }}
      >
        {options.map(({ id, name }) => (
          <Tip key={id} text={value === id && id === shuffles ? 'Shuffle' : null}>
            <ToggleGroupItem
              value={id}
              size="sm"
              // Room for the dice is always kept
              className={cn(
                'relative h-7 font-normal hover:bg-transparent aria-pressed:bg-transparent',
                id === shuffles && 'pe-7',
              )}
            >
              {value === id && (
                <ChosenPill
                  id={`${label}-chosen`}
                  radius={14}
                  className="inset-0 bg-background shadow-sm"
                />
              )}
              <span className="relative">{name}</span>
              <PopIn
                shown={value === id && id === shuffles}
                className="absolute right-2 inline-flex text-muted-foreground"
              >
                <Dice />
              </PopIn>
            </ToggleGroupItem>
          </Tip>
        ))}
      </ToggleGroup>
    </div>
  )
}

const Divider = () => <span className="h-4 w-px bg-border max-sm:hidden" />

const SwitchRow = ({
  label,
  checked,
  onChange,
  className,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}) => (
  <label className={cn('flex h-8 items-center justify-between gap-2 px-2 text-sm', className)}>
    {label}
    <Switch checked={checked} onCheckedChange={onChange} />
  </label>
)

/** Leaves out options this tile can't show. */
const PatternBar = () => {
  const design = useApp((app) => app.design)
  const { setShift, setTurn, setAlternateColours, setGaps, setAngled, reshuffle } =
    useApp.getState()
  const useful = useMemo(() => usefulVariations(design), [design])

  const shape = 'flex max-w-full rounded-(--bar-radius) bg-background shadow-md'

  if (!useful.gaps) {
    return (
      <p className={cn(shape, 'px-4 py-3 text-sm text-muted-foreground')} style={BAR_SHAPE}>
        Add a shape to the tile first.
      </p>
    )
  }

  return (
    <div className={cn(shape, 'flex-col gap-1 p-(--bar-gap)')} style={BAR_SHAPE}>
      <Segmented label="Shift" options={SHIFTS} value={design.shift.axis} onChange={setShift} />
      {useful.turns.length > 1 && (
        <Segmented
          label="Turn"
          options={TILE_TURNS.filter(({ id }) => useful.turns.includes(id))}
          value={useful.shownTurn}
          onChange={setTurn}
          shuffles="scatter"
          onShuffle={reshuffle}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-2 max-sm:flex-col max-sm:items-stretch">
        {useful.alternateColours && (
          <>
            <SwitchRow
              label="Alternate colours"
              checked={design.alternateColours}
              onChange={setAlternateColours}
            />
            <Divider />
          </>
        )}
        <div className="relative">
          <SwitchRow
            label="Hide some tiles"
            checked={design.gaps}
            onChange={setGaps}
            className="gap-8"
          />
          {/* Outside the label, which would take the button's clicks. */}
          <PopIn shown={design.gaps} className="absolute top-1 right-11 inline-flex">
            <Tip text="Shuffle">
              <Button variant="ghost" size="icon-xs" aria-label="Shuffle" onClick={reshuffle}>
                <Dice />
              </Button>
            </Tip>
          </PopIn>
        </div>
        <Divider />
        <SwitchRow label="Angle pattern" checked={design.angled} onChange={setAngled} />
      </div>
    </div>
  )
}

export const PatternControls = ({ visible, hint }: { visible: boolean; hint: ReactNode }) => {
  const barSlide = useTuning((tuning) => tuning.canvas.barSlide)
  const { panel, focus } = useTuning((tuning) => tuning.motion)
  const peeking = useApp((app) => app.peeking)
  const away = { opacity: 0, scale: 0.96, y: barSlide }
  // Peeking just fades, without the slide
  const variants = {
    shown: { opacity: 1, scale: 1, y: 0 },
    gone: (peek: boolean) => (peek ? { opacity: 0, transition: toTransition(focus) } : away),
  }

  return (
    <AnimatePresence initial={false} custom={peeking}>
      {visible && (
        <div
          key="bar"
          className="pointer-events-none absolute inset-x-2 flex justify-center bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
        >
          <motion.div
            className="flex max-w-full flex-col items-center gap-2"
            variants={variants}
            custom={peeking}
            initial="gone"
            animate="shown"
            exit="gone"
            transition={toTransition(panel)}
          >
            {hint}
            <div className="pointer-events-auto max-w-full">
              <PatternBar />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
