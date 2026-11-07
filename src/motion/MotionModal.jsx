import { Children, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_MATERIAL, SPRING_UI, usePrefersReducedMotion } from "./presets.js";

export function useClosableMotion(onClose) {
  const [present, setPresent] = useState(true);
  return {
    present,
    requestClose: () => setPresent(false),
    onExitComplete: () => onClose(),
  };
}

/**
 * Backdrop + one child surface (section/dialog). Set instant for keyboard-heavy UI (shortcuts).
 */
export function MotionModal({
  present,
  onExitComplete,
  onBackdropClose,
  backdropClass = "modal-backdrop",
  instant = false,
  children,
}) {
  const reduce = usePrefersReducedMotion();
  const child = Children.only(children);

  if (instant || reduce) {
    if (!present) return null;
    return (
      <div
        className={backdropClass}
        role="presentation"
        onMouseDown={(event) => { if (event.target === event.currentTarget) onBackdropClose(); }}
      >
        {child}
      </div>
    );
  }

  const Surface = motion.create(child.type);

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {present && (
        <motion.div
          key="motion-modal-backdrop"
          className={backdropClass}
          role="presentation"
          data-motion-modal=""
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={SPRING_UI}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onBackdropClose(); }}
        >
          <Surface
            {...child.props}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={SPRING_MATERIAL}
            onMouseDown={(event) => event.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
