import { useEffect } from 'react'
import { Redo2Icon, Undo2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useApp } from '@/state/store'
import { isTyping } from './isTyping'
import { Tip } from './Tip'

const COMMAND = /mac/i.test(navigator.platform) ? '⌘' : 'Ctrl+'

export const HistoryButtons = () => {
  const canUndo = useApp((app) => app.history.past.length > 0)
  const canRedo = useApp((app) => app.history.future.length > 0)
  const { undo, redo, endGesture } = useApp.getState()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || isTyping(event.target)) return

      const key = event.key.toLowerCase()
      if (key === 'z' && event.shiftKey) redo()
      else if (key === 'z') undo()
      else if (key === 'y') redo()
      else return
      event.preventDefault()
    }

    window.addEventListener('keydown', onKey)
    // Captured, so no control can hide the end of a drag
    window.addEventListener('keyup', endGesture, true)
    window.addEventListener('pointerup', endGesture, true)
    window.addEventListener('pointercancel', endGesture, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', endGesture, true)
      window.removeEventListener('pointerup', endGesture, true)
      window.removeEventListener('pointercancel', endGesture, true)
    }
  }, [undo, redo, endGesture])

  return (
    <div className="flex items-center gap-0.5">
      {/* Tips on wrappers, so they still show while disabled. */}
      <Tip text={`Undo (${COMMAND}Z)`} side="bottom">
        <span className="inline-flex">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Undo"
            disabled={!canUndo}
            onClick={undo}
          >
            <Undo2Icon />
          </Button>
        </span>
      </Tip>
      <Tip text={`Redo (${COMMAND}${COMMAND === '⌘' ? '⇧Z' : 'Y'})`} side="bottom">
        <span className="inline-flex">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Redo"
            disabled={!canRedo}
            onClick={redo}
          >
            <Redo2Icon />
          </Button>
        </span>
      </Tip>
    </div>
  )
}
