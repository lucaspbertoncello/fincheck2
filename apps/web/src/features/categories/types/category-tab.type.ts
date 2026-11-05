import type { CategoryFilterKey } from '@fincheck/ui';

export type CategoryTab = Exclude<CategoryFilterKey, 'tags'>;
