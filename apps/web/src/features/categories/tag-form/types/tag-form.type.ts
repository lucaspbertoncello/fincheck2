import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';

/** What the tag modal does: create a tag or rename one. */
export type TagFormTarget = { mode: 'create' } | { mode: 'rename'; tag: Tag.Dto };
