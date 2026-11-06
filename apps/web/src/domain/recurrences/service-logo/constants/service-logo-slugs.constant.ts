import type { SubscriptionService } from '@fincheck/shared/recurrences/subscription-service/subscription-service.type.ts';
import type { ServiceLogoSlug } from '@fincheck/ui';

/**
 * The logo file each subscription service draws (Simple Icons), or `null` when the design system has
 * none yet: the row then shows its category icon.
 */
export const SERVICE_LOGO_SLUGS: Record<SubscriptionService.Slug, ServiceLogoSlug | null> = {
  netflix: 'netflix',
  youtube: 'youtube',
  hbomax: 'hbomax',
  disneyplus: null,
  primevideo: null,
  appletv: 'appletv',
  globoplay: null,
  paramountplus: 'paramountplus',
  crunchyroll: 'crunchyroll',
  starplus: null,
  spotify: 'spotify',
  youtubemusic: 'youtubemusic',
  applemusic: 'applemusic',
  deezer: 'deezer',
  amazonmusic: null,
  tidal: 'tidal',
  chatgpt: null,
  claude: 'claude',
  googlegemini: 'googlegemini',
  deepseek: 'deepseek',
  zdotai: 'zdotai',
  perplexity: 'perplexity',
  grok: null,
  mistralai: 'mistralai',
  githubcopilot: 'githubcopilot',
  midjourney: null,
};
