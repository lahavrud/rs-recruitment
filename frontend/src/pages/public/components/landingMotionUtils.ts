import type { Variants } from "motion/react";

/* Shared motion vocabulary for the landing page.
   Few animations, each one heavy and smooth: long durations, deep easing. */

/** power3.out equivalent - matches the app's existing reveal curves. */
export const EASE_OUT = [0.215, 0.61, 0.355, 1] as const;

export const REVEAL_DURATION = 0.9;
export const STAGGER_CHILDREN = 0.14;

/** Viewport config: reveal once, slightly before the element fully enters. */
export const VIEWPORT_ONCE = { once: true, amount: 0.25 } as const;

/** Container that staggers its children's reveals. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER_CHILDREN } },
};

/** Standard rise - content floats up out of the dark. */
export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: REVEAL_DURATION, ease: EASE_OUT },
  },
};
