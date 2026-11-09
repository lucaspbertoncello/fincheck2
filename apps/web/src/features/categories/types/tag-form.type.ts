import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';

/**
 * What the tag modal does: create a tag inside a category (a tag never lives outside one) or
 * rename one.
 */
export type TagFormTarget =
  | { mode: 'create'; category: { id: string; name: string } }
  | { mode: 'rename'; tag: Tag.Dto; categoryName: string };
