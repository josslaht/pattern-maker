import type { TransitionConfig } from 'dialkit'
import type { ValueAnimationTransition } from 'motion/react'

/** DialKit can switch a spring dial to an easing curve; Motion calls that a tween. */
export const toTransition = (config: TransitionConfig): ValueAnimationTransition =>
  config.type === 'easing'
    ? { type: 'tween', duration: config.duration, ease: config.ease }
    : config
