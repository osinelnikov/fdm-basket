type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void) => unknown };

/** Runs a DOM update as a View Transition where supported and motion is welcome; otherwise updates directly. */
export function withSmoothTransition(update: () => void): void {
  const doc = document as ViewTransitionDocument;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  if (reduceMotion || typeof doc.startViewTransition !== 'function') {
    update();
    return;
  }
  doc.startViewTransition(update);
}
