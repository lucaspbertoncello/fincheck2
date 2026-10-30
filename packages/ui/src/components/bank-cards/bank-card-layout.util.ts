import type { CSSProperties } from 'react';

import type { BankMarkCorner } from '#/components/bank-cards/bank-theme.type.ts';

export type BankCardLayout = {
  /** grid-template-areas of the card: the theme picks the corner of the mark and the network. */
  areas: string;
  bn: CSSProperties;
  nfc: CSSProperties;
  data: CSSProperties;
  net: CSSProperties;
};

const AREAS = {
  tl: ['bn nfc', 'data net'],
  tr: ['nfc bn', 'data net'],
  bl: ['data nfc', 'bn net'],
  br: ['data nfc', 'net bn'],
} as const satisfies Record<BankMarkCorner, readonly [string, string]>;

const AREAS_NETWORK_TOP = {
  bl: ['data net', 'bn nfc'],
  br: ['data net', 'nfc bn'],
} as const;

/** Places the four pieces of the card (mark, contactless, data, network) for a theme. */
export function getBankCardLayout(corner: BankMarkCorner, networkTop: boolean): BankCardLayout {
  const right = corner === 'tr' || corner === 'br';
  const bottom = corner === 'bl' || corner === 'br';
  const flipped = bottom && networkTop;
  const [top, base] = flipped ? AREAS_NETWORK_TOP[corner] : AREAS[corner];

  const bn: CSSProperties = {
    gridArea: 'bn',
    alignSelf: bottom ? 'end' : 'start',
    flexDirection: bottom ? 'column-reverse' : 'column',
    ...(right ? { alignItems: 'flex-end', textAlign: 'right', justifySelf: 'end' } : {}),
  };
  const nfc: CSSProperties = {
    gridArea: 'nfc',
    justifySelf: right ? 'start' : 'end',
    alignSelf: flipped ? 'end' : 'start',
  };
  const data: CSSProperties = { gridArea: 'data', alignSelf: bottom ? 'start' : 'end' };
  const net: CSSProperties = {
    gridArea: 'net',
    justifySelf: right && bottom ? 'start' : 'end',
    alignSelf: flipped ? 'start' : 'end',
  };

  return { areas: `"${top}" "chip chip" "${base}"`, bn, nfc, data, net };
}
