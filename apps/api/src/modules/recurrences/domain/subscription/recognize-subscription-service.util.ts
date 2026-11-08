import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import { SUBSCRIPTION_SERVICES } from '@fincheck/shared/recurrences/subscription-service/subscription-service.constant.ts';
import type { SubscriptionService } from '@fincheck/shared/recurrences/subscription-service/subscription-service.type.ts';

// A name shorter than this is too common inside other words ("Max", "GLM") to tell a service by;
// those are told only by their slug.
const MIN_NAME_LENGTH = 4;

const collapse = (text: string) => normalizeText(text).replace(/[^A-Z0-9]/g, '');

// The service a description names ("NETFLIX.COM", "GOOGLE *YOUTUBEPREMIUM"), told by the slug or the
// name the shared list gives it, with no slug written here. The longest piece found wins, so
// "YOUTUBEMUSIC" is not "YouTube Premium". Only a guess: null when it names none.
export function recognizeSubscriptionService(description: string): SubscriptionService.Slug | null {
  const text = collapse(description);
  let best: { slug: SubscriptionService.Slug; length: number } | null = null;

  for (const service of SUBSCRIPTION_SERVICES) {
    const pieces = [collapse(service.slug), collapse(service.name)].filter(
      (piece, index) => index === 0 || piece.length >= MIN_NAME_LENGTH,
    );
    for (const piece of pieces) {
      if (piece !== '' && text.includes(piece) && (!best || piece.length > best.length)) {
        best = { slug: service.slug, length: piece.length };
      }
    }
  }

  return best?.slug ?? null;
}
