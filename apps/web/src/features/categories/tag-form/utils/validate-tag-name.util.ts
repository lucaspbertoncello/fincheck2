import { updateTagRequestSchema } from '@fincheck/shared/categories/tag/tag.schema.ts';

type TagNameResult = { ok: true; name: string } | { ok: false; error: string };

/** Checks the tag name with the name schema of the contract (the one a rename sends); the message is in pt-BR. */
export function validateTagName(name: string): TagNameResult {
  const parsed = updateTagRequestSchema.safeParse({ name });
  if (parsed.success) return { ok: true, name: parsed.data.name };

  const tooLong = parsed.error.issues.some((issue) => issue.code === 'too_big');
  return { ok: false, error: tooLong ? 'Use até 30 caracteres.' : 'Dê um nome à tag.' };
}
