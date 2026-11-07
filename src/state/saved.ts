import { parseLearned, type Learned } from '@/pattern/hints'
import type { Design } from '@/pattern/model'
import { parseDesign } from '@/pattern/saved'

const KEY = 'pattern-maker:design'
const LEARNED_KEY = 'pattern-maker:learned'

// Storage can be blocked or full. Then work just doesn't survive a reload.

export const readSavedDesign = () => {
  try {
    return parseDesign(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

export const saveDesign = (design: Design) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(design))
  } catch {}
}

export const readLearned = () => {
  try {
    return parseLearned(localStorage.getItem(LEARNED_KEY))
  } catch {
    return parseLearned(null)
  }
}

export const saveLearned = (learned: Learned) => {
  try {
    localStorage.setItem(LEARNED_KEY, JSON.stringify(learned))
  } catch {}
}
