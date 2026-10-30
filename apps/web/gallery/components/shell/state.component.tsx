import { useState, type ReactNode } from 'react';

type StateProps<T> = {
  initial: T;
  children: (value: T, setValue: (next: T) => void) => ReactNode;
};

/** Holds the state of one controlled demo, so the sections can stay plain data. */
export function State<T>({ initial, children }: StateProps<T>) {
  const [value, setValue] = useState(initial);
  return <>{children(value, setValue)}</>;
}
