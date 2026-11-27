import { useLayoutEffect, useState } from 'react';
import { prefersReducedMotion, subscribeReducedMotion } from '@/theme/motion';

/** Keep Ant's portal and focus ownership until the form's own transitions end. */
export function useProjectFormPresence(
  open: boolean,
  pendingExit: () => readonly Promise<unknown>[],
): boolean {
  const [present, setPresent] = useState(open);

  useLayoutEffect(() => {
    if (open) {
      setPresent(true);
      return;
    }
    if (!present) return;

    // Closing before the first paint (or under reduced motion) can produce no
    // transition at all. Never depend on transitionend to unmount the dialog.
    const outgoing = prefersReducedMotion() ? [] : pendingExit();
    if (!outgoing.length) {
      setPresent(false);
      return;
    }
    let current = true;
    const finish = () => {
      if (current) setPresent(false);
    };
    // Retiring an outgoing CSS transition isn't guaranteed to settle a previously
    // captured Animation.finished in every browser. Reduced motion is an
    // explicit lifecycle decision: release the portal without waiting.
    const unsubscribe = subscribeReducedMotion(() => {
      if (prefersReducedMotion()) finish();
    });
    void Promise.allSettled(outgoing).then(finish);
    return () => {
      current = false;
      unsubscribe();
    };
  }, [open, present, pendingExit]);

  return open || present;
}
