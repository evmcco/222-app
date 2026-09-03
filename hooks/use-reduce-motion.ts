import { AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';

/**
 * Tracks the OS "reduce motion" setting so decorative animation can be skipped.
 * Defaults to motion-enabled if the platform probe is unavailable.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {
        // Probe unsupported on this platform — decorative motion stays on.
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => setReduceMotion(enabled),
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
