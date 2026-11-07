import { create } from 'zustand'
import { tuningDefaults } from './config'

/** Outside React, use `useTuning.getState()`. */
export const useTuning = create(() => tuningDefaults)

// A hot reload makes a second store that old listeners don't see. Reload instead.
if (import.meta.hot) {
  import.meta.hot.accept(() => location.reload())
}
