// The input box surface, shared with PendingActionBar so a pause can take over
// the same slot without the frame or the height shifting.
export const INPUT_SURFACE_CLASS_NAME =
  'relative flex flex-col justify-between gap-xs rounded-3xl bg-chatbox-background-secondary px-4 py-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.2)]'

/** Desktop only: keeps the swap between input and pause from jumping. */
export const INPUT_SURFACE_MIN_HEIGHT_CLASS_NAME = 'min-h-[92px]'

export const INPUT_SURFACE_STYLE = { border: '1px solid var(--chatbox-border-primary)' }
