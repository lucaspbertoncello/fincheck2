import { z } from 'zod';

import { INSTITUTION_CODES } from './institution.constant.ts';

export const institutionCodeSchema = z.enum(INSTITUTION_CODES);
