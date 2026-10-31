import { createContext, useContext } from 'react';

/**
 * The left column of the grid on the screens that have no summary panel (Configurações). The
 * shell renders an empty, sticky element there and shares it; the screen portals its own side
 * content into it, so the content starts at the same x and width as on every other screen.
 * `null` on the phone and while the element is not mounted yet.
 */
export const PanelSlotContext = createContext<HTMLElement | null>(null);

export function usePanelSlot(): HTMLElement | null {
  return useContext(PanelSlotContext);
}
