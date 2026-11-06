import type { SubscriptionService } from '@fincheck/shared/recurrences/subscription-service/subscription-service.type.ts';

type ServicePattern = {
  slug: SubscriptionService.Slug;
  /**
   * What the charge description may say, tested on the normalized text (see `normalizeServiceText`):
   * capitals, no accents, "+" written as "PLUS", every other mark turned into a space.
   */
  patterns: readonly RegExp[];
};

/**
 * What each of the 26 services of BR-REC-017 looks like in a description, in the order the first
 * match wins: the narrower name comes before the wider one (YouTube Music and Amazon Music before
 * YouTube Premium and Prime Video). The names come from `SUBSCRIPTION_SERVICES`.
 */
export const SERVICE_PATTERNS: readonly ServicePattern[] = [
  { slug: 'netflix', patterns: [/\bNETFLIX\b/] },
  { slug: 'youtubemusic', patterns: [/\bYOUTUBE ?MUSIC\b/] },
  { slug: 'youtube', patterns: [/\bYOUTUBE ?PREMIUM\b/, /\bYOUTUBE\b/] },
  { slug: 'hbomax', patterns: [/\bHBO\b/, /^MAX$/, /^MAX (STREAMING|ASSINATURA|BRASIL)$/] },
  { slug: 'disneyplus', patterns: [/\bDISNEY ?PLUS\b/] },
  { slug: 'amazonmusic', patterns: [/\b(AMAZON|AMZN) ?MUSIC\b/] },
  { slug: 'primevideo', patterns: [/\bPRIME ?VIDEO\b/, /\b(AMAZON|AMZN) ?PRIME\b/] },
  { slug: 'appletv', patterns: [/\bAPPLE ?TV\b/] },
  { slug: 'globoplay', patterns: [/\bGLOBO ?PLAY\b/] },
  { slug: 'paramountplus', patterns: [/\bPARAMOUNT\b/] },
  { slug: 'crunchyroll', patterns: [/\bCRUNCHY ?ROLL\b/] },
  { slug: 'starplus', patterns: [/\bSTAR ?PLUS\b/] },
  { slug: 'spotify', patterns: [/\bSPOTIFY\b/] },
  { slug: 'applemusic', patterns: [/\bAPPLE ?MUSIC\b/] },
  { slug: 'deezer', patterns: [/\bDEEZER\b/] },
  { slug: 'tidal', patterns: [/\bTIDAL\b/] },
  { slug: 'chatgpt', patterns: [/\bCHAT ?GPT\b/, /\bOPENAI\b/] },
  { slug: 'claude', patterns: [/\bCLAUDE\b/, /\bANTHROPIC\b/] },
  { slug: 'googlegemini', patterns: [/\bGEMINI\b/] },
  { slug: 'deepseek', patterns: [/\bDEEP ?SEEK\b/] },
  { slug: 'zdotai', patterns: [/\bGLM\b/, /\bZHIPU\b/, /\bZ AI\b/] },
  { slug: 'perplexity', patterns: [/\bPERPLEXITY\b/] },
  { slug: 'grok', patterns: [/\bGROK\b/, /\bXAI\b/] },
  { slug: 'mistralai', patterns: [/\bMISTRAL\b/, /\bLE CHAT\b/] },
  { slug: 'githubcopilot', patterns: [/\bGITHUB ?COPILOT\b/] },
  { slug: 'midjourney', patterns: [/\bMID ?JOURNEY\b/] },
];
