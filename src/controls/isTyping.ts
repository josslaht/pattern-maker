/** Sliders and switches keep focus after use, but shouldn't swallow shortcuts. */
export const isTyping = (target: EventTarget | null) =>
  target instanceof Element &&
  target.matches('input:not([type=range], [type=checkbox]), textarea, select')
