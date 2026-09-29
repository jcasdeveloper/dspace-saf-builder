import type { Variants } from "motion/react";

/** Fade in + rise slightly. Default enter animation for cards and panels. */
export const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2 },
} as const;

/** Fade in with scale. For dropdowns, popovers, dialogs. */
export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.15 },
} as const;

/** Fade + slide up with spring. For toasts and floating elements. */
export const slideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { type: "spring", stiffness: 300, damping: 25 },
} as const;

/** Exit used with AnimatePresence for toasts and alerts. */
export const slideUpExit = {
  exit: { opacity: 0, y: 12 },
  transition: { duration: 0.15 },
} as const;

/** Collapsible exit/enter for validation banners. Animates height. */
export const collapse = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.2 },
} as const;

/** Stagger container — children using `staggerItem` animate in sequence. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04 },
  },
};

/** Stagger child — slide in from the left (file rows). */
export const staggerItem: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
};

/** Step circle pop-in with spring. Pass index via `custom`. */
export const stepPop: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.08, type: "spring", stiffness: 400, damping: 22 },
  }),
};

/** Screen transition — direction-aware horizontal slide with fade. Pass direction via `custom`. */
export const screenSlide: Variants = {
  initial: (direction: number = 1) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
  exit: (direction: number = 1) => ({
    x: direction > 0 ? -100 : 100,
    opacity: 0,
    transition: { duration: 0.15 },
  }),
};
