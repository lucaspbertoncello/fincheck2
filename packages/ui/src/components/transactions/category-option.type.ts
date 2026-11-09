import type { IconName } from '#/components/icons/icon-markup.constant.ts';

/**
 * A category the user can pick: id, name and the icon of its circle. `group` is the heading the
 * picker lists it under; options that share a group sit together, in the order they arrive. Without
 * it the list is flat. The text comes ready from the app: the design system knows no rule behind it.
 */
export type CategoryOption = {
  id: string;
  name: string;
  icon: IconName;
  group?: string;
};
