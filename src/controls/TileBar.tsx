import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion, PresenceContext } from 'motion/react'
import { PaletteIcon, ShapesIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TEMPLATE_BY_ID, TEMPLATES, type TemplateId } from '@/pattern/templates'
import { useApp, type Drawer } from '@/state/store'
import { useTuning } from '@/tuning/store'
import { toTransition } from '@/tuning/transition'
import { ColourDots, MoodsDrawer, PickerDrawer } from './Colours'
import { ShapeActions, ShapesDrawer } from './Shapes'
import { Tip } from './Tip'

/** One radius folded or not. Anything inside uses the radius minus the gap. */
export const BAR_SHAPE = {
  '--bar-gap': '6px',
  '--bar-radius': '22px',
  '--bar-inner': 'calc(var(--bar-radius) - var(--bar-gap))',
} as CSSProperties

const TemplateGlyph = ({
  template,
  strokeWidth = 1.25,
  className = 'size-full',
}: {
  template: TemplateId
  strokeWidth?: number
  className?: string
}) => (
  <svg viewBox="-0.04 -0.04 1.08 1.08" className={className} aria-hidden>
    {TEMPLATE_BY_ID[template].slots.map((slot, k) => (
      <polygon
        key={k}
        points={slot.poly.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    ))}
  </svg>
)

const TemplatesDrawer = () => {
  const template = useApp((app) => app.design.template)
  const setTemplate = useApp((app) => app.setTemplate)

  return (
    <ToggleGroup
      className="grid w-full grid-cols-7 gap-1"
      value={[template]}
      onValueChange={([next]) => next && setTemplate(next as TemplateId)}
    >
      {TEMPLATES.map((item) => (
        <Tip key={item.id} text={item.name}>
          <ToggleGroupItem
            value={item.id}
            aria-label={item.name}
            className="aspect-square h-auto min-w-0 rounded-(--bar-inner) p-2.5 md:aspect-auto md:h-18"
          >
            <TemplateGlyph template={item.id} />
          </ToggleGroupItem>
        </Tip>
      ))}
    </ToggleGroup>
  )
}

const DrawerButton = ({
  drawer,
  label,
  tip,
  children,
}: {
  drawer: Drawer
  label: string
  tip?: string
  children: ReactNode
}) => {
  const open = useApp((app) => app.drawer === drawer)
  const toggleDrawer = useApp((app) => app.toggleDrawer)

  return (
    <Tip text={open ? null : tip} side="bottom">
      <Button
        variant={open ? 'secondary' : 'ghost'}
        size="sm"
        aria-expanded={open}
        onClick={() => toggleDrawer(drawer)}
      >
        <span className="size-5 shrink-0">{children}</span>
        <span className="max-md:sr-only">{label}</span>
      </Button>
    </Tip>
  )
}

const Divider = () => <span className="mx-1 h-5 w-px shrink-0 bg-border max-md:hidden" />

/** Measures its own height, since browsers can't animate between two `auto` heights. */
const DrawerBox = ({ drawer }: { drawer: Drawer }) => {
  const { panel, focus } = useTuning((tuning) => tuning.motion)
  const content = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>('auto')

  useEffect(() => {
    const element = content.current
    if (!element) return
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <motion.div
      // Zero width, so the button row decides how wide the bar is
      className="flex w-0 min-w-full min-h-0 flex-col justify-start overflow-hidden"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={toTransition(panel)}
    >
      <div className="flex min-h-0 flex-col overflow-y-auto">
        <div ref={content} className="shrink-0 p-(--bar-gap) pt-0">
          {/* Resets the bar's `initial={false}`, so the first switch fades too. */}
          <PresenceContext.Provider value={null}>
            <motion.div
              key={drawer}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={toTransition(focus)}
            >
              {drawer === 'tile' && <TemplatesDrawer />}
              {drawer === 'shapes' && <ShapesDrawer />}
              {drawer === 'moods' && <MoodsDrawer />}
              {drawer === 'picker' && <PickerDrawer />}
            </motion.div>
          </PresenceContext.Provider>
        </div>
      </div>
    </motion.div>
  )
}

export const TileBar = () => {
  const drawer = useApp((app) => app.drawer)
  const design = useApp((app) => app.design)

  return (
    <div
      className="flex max-h-full w-fit max-w-full flex-col rounded-(--bar-radius) bg-background shadow-md"
      style={BAR_SHAPE}
    >
      <div className="flex shrink-0 items-center justify-center p-(--bar-gap) max-md:flex-wrap">
        <div className="flex items-center justify-center gap-(--bar-gap) max-md:flex-wrap">
          <DrawerButton drawer="tile" label="Tile">
            <TemplateGlyph
              template={design.template}
              strokeWidth={5 / 3}
              className="size-full p-px"
            />
          </DrawerButton>
          <DrawerButton drawer="shapes" label="Shapes">
            <ShapesIcon className="size-full" />
          </DrawerButton>
          <Divider />
          <DrawerButton drawer="moods" label="Moods" tip="Pick a different palette">
            <PaletteIcon className="size-full" />
          </DrawerButton>
          <ColourDots />
        </div>
        <ShapeActions />
      </div>

      <AnimatePresence initial={false}>
        {drawer && <DrawerBox key="drawer" drawer={drawer} />}
      </AnimatePresence>
    </div>
  )
}
