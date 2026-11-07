import {
  coverRange,
  outputName,
  outputSize,
  outputFrame,
  type Rect,
  type Size,
} from '@/pattern/camera'
import type { Design } from '@/pattern/model'
import { useApp } from '@/state/store'
import { useTuning } from '@/tuning/store'
import { PatternCopies } from './PatternArt'

export type FileKind = 'png' | 'svg'

/** Same component as the screen. The clip stops design programs showing the tiles past the edge. */
export const patternSvg = async (design: Design, frame: Rect, size: Size) => {
  // Only saving needs it, so it stays out of the main bundle
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { canvas, optical } = useTuning.getState()
  const pixelsPerTile = size.width / frame.width

  return renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`}
      width={size.width}
      height={size.height}
    >
      <clipPath id="frame">
        <rect {...frame} />
      </clipPath>
      <g clipPath="url(#frame)">
        <PatternCopies
          design={design}
          optical={optical}
          bleed={canvas.bleed / pixelsPerTile}
          forFile
          range={coverRange([frame], 1)}
        />
      </g>
    </svg>,
  )
}

export const svgToPng = async (svg: string, size: Size) => {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()

    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    canvas.getContext('2d')?.drawImage(image, 0, 0, size.width, size.height)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((png) => (png ? resolve(png) : reject(new Error('No image'))), 'image/png')
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

const download = (file: Blob, name: string) => {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(file)
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

let busy = false

export const savePattern = async (kind: FileKind) => {
  if (busy) return
  busy = true

  const { design, layout, across, customSize, showSaved, showHint } = useApp.getState()
  const size = outputSize(design, layout, customSize)
  const frame = outputFrame(design, layout, layout === 'tile' ? 1 : across[layout], customSize)
  const name = outputName(design, layout, kind, customSize)

  try {
    const svg = await patternSvg(design, frame, size)
    const file =
      kind === 'svg' ? new Blob([svg], { type: 'image/svg+xml' }) : await svgToPng(svg, size)
    download(file, name)
    showSaved(name)
  } catch {
    showHint('That didn’t save. Try again?')
  } finally {
    busy = false
  }
}
