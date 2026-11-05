import type { ServiceLogoSlug } from '@fincheck/ui';

export type ServicePattern = {
  /** The name of the service as the screen says it. */
  name: string;
  /** The logo file (Simple Icons), or `null` when there is none: the circle writes the initial. */
  slug: ServiceLogoSlug | null;
  /**
   * What the charge description may say, tested on the normalized text (see `normalizeServiceText`):
   * capitals, no accents, "+" written as "PLUS", every other mark turned into a space.
   */
  patterns: readonly RegExp[];
};

/**
 * The 26 services of BR-REC-017 ("Logo oficial"), in the order the first match wins: the narrower
 * name comes before the wider one (YouTube Music and Amazon Music before YouTube Premium and Prime
 * Video).
 */
export const SERVICE_PATTERNS: readonly ServicePattern[] = [
  { name: 'Netflix', slug: 'netflix', patterns: [/\bNETFLIX\b/] },
  { name: 'YouTube Music', slug: 'youtubemusic', patterns: [/\bYOUTUBE ?MUSIC\b/] },
  { name: 'YouTube Premium', slug: 'youtube', patterns: [/\bYOUTUBE ?PREMIUM\b/, /\bYOUTUBE\b/] },
  {
    name: 'Max',
    slug: 'hbomax',
    patterns: [/\bHBO\b/, /^MAX$/, /^MAX (STREAMING|ASSINATURA|BRASIL)$/],
  },
  { name: 'Disney+', slug: null, patterns: [/\bDISNEY ?PLUS\b/] },
  { name: 'Amazon Music', slug: null, patterns: [/\b(AMAZON|AMZN) ?MUSIC\b/] },
  {
    name: 'Prime Video',
    slug: null,
    patterns: [/\bPRIME ?VIDEO\b/, /\b(AMAZON|AMZN) ?PRIME\b/],
  },
  { name: 'Apple TV+', slug: 'appletv', patterns: [/\bAPPLE ?TV\b/] },
  { name: 'Globoplay', slug: null, patterns: [/\bGLOBO ?PLAY\b/] },
  { name: 'Paramount+', slug: 'paramountplus', patterns: [/\bPARAMOUNT\b/] },
  { name: 'Crunchyroll', slug: 'crunchyroll', patterns: [/\bCRUNCHY ?ROLL\b/] },
  { name: 'Star+', slug: null, patterns: [/\bSTAR ?PLUS\b/] },
  { name: 'Spotify', slug: 'spotify', patterns: [/\bSPOTIFY\b/] },
  { name: 'Apple Music', slug: 'applemusic', patterns: [/\bAPPLE ?MUSIC\b/] },
  { name: 'Deezer', slug: 'deezer', patterns: [/\bDEEZER\b/] },
  { name: 'Tidal', slug: 'tidal', patterns: [/\bTIDAL\b/] },
  { name: 'ChatGPT', slug: null, patterns: [/\bCHAT ?GPT\b/, /\bOPENAI\b/] },
  { name: 'Claude', slug: 'claude', patterns: [/\bCLAUDE\b/, /\bANTHROPIC\b/] },
  { name: 'Gemini', slug: 'googlegemini', patterns: [/\bGEMINI\b/] },
  { name: 'DeepSeek', slug: 'deepseek', patterns: [/\bDEEP ?SEEK\b/] },
  { name: 'GLM', slug: 'zdotai', patterns: [/\bGLM\b/, /\bZHIPU\b/, /\bZ AI\b/] },
  { name: 'Perplexity', slug: 'perplexity', patterns: [/\bPERPLEXITY\b/] },
  { name: 'Grok', slug: null, patterns: [/\bGROK\b/, /\bXAI\b/] },
  { name: 'Mistral', slug: 'mistralai', patterns: [/\bMISTRAL\b/, /\bLE CHAT\b/] },
  { name: 'GitHub Copilot', slug: 'githubcopilot', patterns: [/\bGITHUB ?COPILOT\b/] },
  { name: 'Midjourney', slug: null, patterns: [/\bMID ?JOURNEY\b/] },
];
