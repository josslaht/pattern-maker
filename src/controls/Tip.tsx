import type { ReactElement, ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useApp } from '@/state/store'

/** `children` must pass its props on. With no text it still wraps, so nothing remounts. */
export const Tip = ({
  text,
  side = 'top',
  children,
}: {
  text: ReactNode
  side?: 'top' | 'bottom'
  children: ReactElement
}) => {
  const dragging = useApp((app) => app.drag !== null)

  return (
    <Tooltip disabled={dragging || !text}>
      <TooltipTrigger render={children} />
      <TooltipContent side={side} sideOffset={8}>
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
