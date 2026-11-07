import type { DialConfig, ResolvedValues } from 'dialkit'

// Sliders are [default, min, max, step]. Production only uses the default.
export const tuningConfig = {
  canvas: {
    // Share of the canvas's shorter side
    tileShare: [0.47, 0.15, 0.7, 0.01],
    shapeSizeMin: [0.3, 0.1, 0.6, 0.01],
    shapeSizeMax: [1, 0.6, 1.4, 0.01],
    barGap: [16, 0, 64, 1],
    barSlide: [16, 0, 64, 1],
    // Seconds. Shorter is a tap, longer is a peek
    spaceTap: [0.15, 0.1, 0.6, 0.01],
    trayShape: [34, 16, 48, 1],
    dragLift: [1.35, 1, 2, 0.01],
    dragLiftOverTarget: [0.9, 0.4, 1.5, 0.01],
    dragOpacityOverTarget: [0.35, 0, 1, 0.01],
    colourCarried: [30, 12, 64, 1],
    colourBloom: [2.4, 1, 6, 0.1],
    // Middle of a slot that counts as the shape rather than the patch
    shapeZone: [0.8, 0.4, 1, 0.01],
    dragTilt: [16, 0, 40, 1],
    dropFrom: [0.7, 0.2, 1, 0.01],
    dropPress: [0.14, 0, 0.4, 0.01],
    hoverScale: [1.05, 1, 1.3, 0.01],
    pressScale: [0.97, 0.7, 1, 0.01],
    actionRest: [0.85, 0.5, 1, 0.01],
    labelFrom: [0.9, 0.5, 1, 0.01],
    tipDelay: [0.6, 0, 2, 0.05],
    selectLabelDelay: [0.8, 0, 3, 0.05],
    introHold: [0.5, 0, 4, 0.05],
    introFlight: [0.5, 0.2, 3, 0.05],
    introArrive: [0.3, 0, 1.5, 0.05],
    // Changes before the hint points at the Pattern view anyway
    lookHintAfter: [4, 1, 12, 1],
    saveHintFor: [3, 1, 12, 1],
    fillStagger: [0.03, 0, 0.15, 0.005],
    copyFade: [0.6, 0, 1, 0.01],
    copyFadeWhileDragging: [0.25, 0, 1, 0.01],
    edgeBand: [0.085, 0.02, 0.2, 0.005],
    patternShare: [0.16, 0.05, 0.4, 0.01],
    // Pixels of same-colour stroke, so neighbouring fills meet without a hairline
    bleed: [1, 0, 2, 0.05],
    // Seconds per tile of distance from the tile in focus
    copyWave: [0.035, 0, 0.15, 0.005],
    copyPop: [0.85, 0.5, 1, 0.01],
    saveFlash: [0.7, 0, 1, 0.01],
    // Log of the scale
    saveKick: [0.04, 0, 0.2, 0.005],
  },
  save: {
    previewFill: [0.98, 0.5, 1, 0.01],
    thumb: [44, 24, 72, 1],
  },
  // Fades out towards 100% shape size
  optical: {
    dot: [1, 0.3, 1.2, 0.01],
    ring: [1, 0.3, 1.2, 0.01],
    square: [0.9, 0.3, 1.2, 0.01],
    diamond: [1.05, 0.3, 1.2, 0.01],
    triangle: [1, 0.3, 1.2, 0.01],
    chevron: [1, 0.3, 1.2, 0.01],
    cross: [1, 0.3, 1.2, 0.01],
    leaf: [1.05, 0.3, 1.2, 0.01],
    star: [1, 0.3, 1.2, 0.01],
    arch: [1, 0.3, 1.2, 0.01],
  },
  motion: {
    camera: { type: 'spring', visualDuration: 0.3, bounce: 0.12 },
    intro: { type: 'spring', visualDuration: 0.5, bounce: 0.1 },
    // Holding Space
    focus: { type: 'spring', visualDuration: 0.15, bounce: 0.1 },
    pickUp: { type: 'spring', visualDuration: 0.2, bounce: 0.4 },
    drop: { type: 'spring', visualDuration: 0.3, bounce: 0.1 },
    press: { type: 'spring', visualDuration: 0.15, bounce: 0.5 },
    rotate: { type: 'spring', visualDuration: 0.3, bounce: 0.1 },
    snap: { type: 'spring', visualDuration: 0.3, bounce: 0.1 },
    panel: { type: 'spring', visualDuration: 0.25, bounce: 0.1 },
    // No bounce: overshooting a colour looks wrong
    recolour: { type: 'spring', visualDuration: 0.45, bounce: 0 },
    copies: { type: 'spring', visualDuration: 0.5, bounce: 0.1 },
    saveKick: { type: 'spring', visualDuration: 0.4, bounce: 0.5 },
    saveFlash: { type: 'spring', visualDuration: 0.4, bounce: 0 },
    previewMorph: { type: 'spring', visualDuration: 0.45, bounce: 0.18 },
  },
} satisfies DialConfig

export type Tuning = ResolvedValues<typeof tuningConfig>

const isFolder = (value: object) => !Array.isArray(value) && !('type' in value)

const defaultsOf = (config: object): unknown =>
  Object.fromEntries(
    Object.entries(config).map(([key, value]) => {
      if (Array.isArray(value)) return [key, value[0]]
      return [key, isFolder(value) ? defaultsOf(value) : value]
    }),
  )

export const tuningDefaults = defaultsOf(tuningConfig) as Tuning
