import { lazy, Suspense } from 'react'
import { AnimatePresence, MotionConfig } from 'motion/react'
import { Canvas } from '@/canvas/Canvas'
import { DragLayer } from '@/canvas/DragLayer'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Header } from '@/controls/Header'
import { SaveView } from '@/controls/SaveView'
import { useApp } from '@/state/store'
import { useTuning } from '@/tuning/store'

const TuningPanel = import.meta.env.DEV ? lazy(() => import('@/tuning/TuningPanel')) : null

const App = () => {
  const tipDelay = useTuning((tuning) => tuning.canvas.tipDelay)
  const saving = useApp((app) => app.saving)

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delay={tipDelay * 1000}>
        {/* A frame round the canvas, except on a phone where the room matters more */}
        <div className="relative h-full p-4 max-sm:p-0">
          {/* Stays as it was under the Save view, so closing it goes straight back. */}
          <div className="contents" inert={saving}>
            <main className="h-full">
              <Canvas />
            </main>
            <Header />
          </div>
          {/* Over everything, header too: saving is the only thing to do there. */}
          <AnimatePresence>{saving && <SaveView />}</AnimatePresence>
        </div>
      </TooltipProvider>

      <DragLayer />

      {TuningPanel && (
        <Suspense fallback={null}>
          <TuningPanel />
        </Suspense>
      )}
    </MotionConfig>
  )
}

export default App
