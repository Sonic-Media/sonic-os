"use client";

import { useEffect, useRef, useState } from "react";

interface UseAnimatedValueOptions {
  duration?: number;
  fromZeroOnMount?: boolean;
}

export function useAnimatedValue(
  value: number,
  { duration = 200, fromZeroOnMount = false }: UseAnimatedValueOptions = {}
) {
  const [displayValue, setDisplayValue] = useState(fromZeroOnMount ? 0 : value);
  const previousValue = useRef(fromZeroOnMount ? 0 : value);
  const hasMounted = useRef(false);

  useEffect(() => {
    const startValue =
      fromZeroOnMount && !hasMounted.current ? 0 : previousValue.current;
    hasMounted.current = true;
    const endValue = value;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + (endValue - startValue) * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    }

    requestAnimationFrame(animate);
  }, [value, duration, fromZeroOnMount]);

  return displayValue;
}
