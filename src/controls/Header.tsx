import { motion } from 'motion/react'
import { CheckIcon, DownloadIcon, LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { designToLink } from '@/pattern/saved'
import { useApp, type View } from '@/state/store'
import { useTuning } from '@/tuning/store'
import { toTransition } from '@/tuning/transition'
import { Hint } from './Hint'
import { HistoryButtons } from './HistoryButtons'
import { Segmented } from './PatternBar'
import { Tip } from './Tip'
import { BAR_SHAPE } from './TileBar'

const VIEWS: { id: View; name: string }[] = [
  { id: 'tile', name: 'Tile' },
  { id: 'pattern', name: 'Pattern' },
]

const COPIED = 'Link copied. Bookmark it or send it on to keep this pattern.'

/** The design goes in the link, so nothing is stored anywhere. */
const copyLink = async () => {
  const { design, showHint } = useApp.getState()
  const link = `${location.origin}${location.pathname}#${designToLink(design)}`
  try {
    await navigator.clipboard.writeText(link)
    showHint(COPIED)
  } catch {
    showHint('The link couldn’t be copied.')
  }
}

const Divider = () => <span className="mx-0.5 h-5 w-px shrink-0 bg-border" />

export const Header = () => {
  const view = useApp((app) => app.view)
  const setView = useApp((app) => app.setView)
  const openSave = useApp((app) => app.openSave)
  const panel = useTuning((tuning) => tuning.motion.panel)
  const { focus, intro: flight } = useTuning((tuning) => tuning.motion)
  const barSlide = useTuning((tuning) => tuning.canvas.barSlide)
  // Drops in as the intro flies into the tile, usable once the tools arrive.
  const intro = useApp((app) => app.intro)
  const peeking = useApp((app) => app.peeking)
  const hidden = intro === 'looking' || peeking
  const waiting = intro !== null && intro !== 'arriving'
  const copied = useApp((app) => app.hint === COPIED)

  return (
    // z-10 so the Save hint can hang over the canvas
    <header className="pointer-events-none absolute inset-x-6 top-7 z-10 flex justify-center max-sm:inset-x-3 max-sm:top-[calc(0.75rem+env(safe-area-inset-top,0px))]">
      <h1 className="sr-only">Pattern maker</h1>

      <motion.div
        className="pointer-events-auto relative flex max-w-full items-center gap-(--bar-gap) rounded-(--bar-radius) bg-background p-(--bar-gap) shadow-md"
        style={BAR_SHAPE}
        inert={hidden || waiting}
        initial={false}
        animate={hidden ? { opacity: 0, y: -barSlide / 2 } : { opacity: 1, y: 0 }}
        transition={toTransition(peeking ? focus : intro === 'flying' ? flight : panel)}
      >
        <HistoryButtons />
        <Divider />
        <Segmented label="View" hideLabel options={VIEWS} value={view} onChange={setView} />
        <Divider />
        <Tip text="Copy link" side="bottom">
          <Button variant="ghost" size="icon-sm" aria-label="Copy link" onClick={copyLink}>
            {copied ? <CheckIcon /> : <LinkIcon />}
          </Button>
        </Tip>
        {/* Just the icon where the header runs out of room */}
        <Button size="sm" className="max-[380px]:w-8 max-[380px]:px-0" onClick={openSave}>
          <DownloadIcon />
          <span className="max-[380px]:sr-only">Save</span>
        </Button>
        <div className="absolute top-full left-1/2 mt-3 w-max -translate-x-1/2">
          <Hint at="save" />
        </div>
      </motion.div>
    </header>
  )
}
