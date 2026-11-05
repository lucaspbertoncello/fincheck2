import type { ReactNode } from 'react';

/** One or two badges: the standard row never carries a third. */
export type ListRowBadges = readonly [ReactNode] | readonly [ReactNode, ReactNode];
