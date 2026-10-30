import { useEffect, useState } from 'react';

/** The value after it stopped changing for `delay` ms: for a preview that should not fire on every key. */
export function useDebouncedValue<Value>(value: Value, delay: number): Value {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
