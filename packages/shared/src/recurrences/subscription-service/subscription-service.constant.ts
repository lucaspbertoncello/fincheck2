export const SUBSCRIPTION_SERVICE_SLUGS = [
  'netflix',
  'youtube',
  'hbomax',
  'disneyplus',
  'primevideo',
  'appletv',
  'globoplay',
  'paramountplus',
  'crunchyroll',
  'spotify',
  'youtubemusic',
  'applemusic',
  'deezer',
  'amazonmusic',
  'tidal',
  'chatgpt',
  'claude',
  'googlegemini',
  'deepseek',
  'zdotai',
  'perplexity',
  'grok',
  'mistralai',
  'githubcopilot',
  'midjourney',
] as const;

// The services a subscription can name (BR-REC-017), in the order the screen lists them: video,
// music, then AI. The slug is stored in `recurrences.service_slug`; where the design system has the
// service's logo, the slug is the same key as the logo.
export const SUBSCRIPTION_SERVICES = [
  { slug: 'netflix', name: 'Netflix' },
  { slug: 'youtube', name: 'YouTube Premium' },
  { slug: 'hbomax', name: 'Max' },
  { slug: 'disneyplus', name: 'Disney+' },
  { slug: 'primevideo', name: 'Prime Video' },
  { slug: 'appletv', name: 'Apple TV+' },
  { slug: 'globoplay', name: 'Globoplay' },
  { slug: 'paramountplus', name: 'Paramount+' },
  { slug: 'crunchyroll', name: 'Crunchyroll' },
  { slug: 'spotify', name: 'Spotify' },
  { slug: 'youtubemusic', name: 'YouTube Music' },
  { slug: 'applemusic', name: 'Apple Music' },
  { slug: 'deezer', name: 'Deezer' },
  { slug: 'amazonmusic', name: 'Amazon Music' },
  { slug: 'tidal', name: 'Tidal' },
  { slug: 'chatgpt', name: 'ChatGPT' },
  { slug: 'claude', name: 'Claude' },
  { slug: 'googlegemini', name: 'Gemini' },
  { slug: 'deepseek', name: 'DeepSeek' },
  { slug: 'zdotai', name: 'GLM' },
  { slug: 'perplexity', name: 'Perplexity' },
  { slug: 'grok', name: 'Grok' },
  { slug: 'mistralai', name: 'Mistral' },
  { slug: 'githubcopilot', name: 'GitHub Copilot' },
  { slug: 'midjourney', name: 'Midjourney' },
] as const satisfies readonly {
  slug: (typeof SUBSCRIPTION_SERVICE_SLUGS)[number];
  name: string;
}[];

// Card descriptions that are never a subscription, however regular (BR-REC-017, Lucas, 06/11/2026):
// delivery, restaurants, groceries, ride apps and fuel. Tested on the normalized description
// (`normalizeText`: capitals, no accents, single spaces), so "Ifood *restaurante" is caught. A
// matching purchase never becomes an automatic suggestion; marking a recurrence by hand still works.
export const SUBSCRIPTION_SUGGESTION_EXCLUSIONS: readonly RegExp[] = [
  // Delivery. iFood Clube and Uber One are memberships, so they stay out of the list.
  /\bIFOOD\b(?! ?CLUBE)/,
  /\bIFD\*/,
  /\bRAPPI\b/,
  /\bUBER ?EATS\b/,
  /\bAIQFOME\b/,
  /\bZE ?DELIVERY\b/,
  /\bDELIVERY\b/,
  // Restaurants
  /\bRESTAURANTES?\b/,
  /\bLANCHONETE\b/,
  /\bPIZZARIA\b/,
  /\bHAMBURGUERIA\b/,
  /\bPADARIA\b/,
  /\bBAR\b/,
  // Groceries
  /\bSUPERMERCADOS?\b/,
  // Not Mercado Pago or Mercado Livre, which charge real subscriptions.
  /\bMERCADO\b(?! ?(LIVRE|PAGO))/,
  /\bHORTIFRUTI\b/,
  /\bATACAD(AO|ISTA)\b/,
  // Ride apps
  /\bUBER\b(?! ?(ONE|EATS))/,
  // "99" alone only at the start: anywhere else it is a price ("9.99").
  /^99\b/,
  /\b99 ?(APP|POP|TAXI|TECNOLOGIA)\b/,
  /\bCABIFY\b/,
  /\bINDRIVE\b/,
  // Fuel
  /\bPOSTO\b/,
  /\bCOMBUSTIVE(L|IS)\b/,
  /\bSHELL\b/,
  /\bIPIRANGA\b/,
  /\bPETROBRAS\b/,
];

// What each of the 25 services looks like in a charge description, in the order the first match
// wins: the narrower name comes before the wider one (YouTube Music and Amazon Music before YouTube
// Premium and Prime Video). Tested on the text `normalizeServiceText` gives: capitals, no accents,
// "+" written as "PLUS", every other mark turned into a space. The names come from
// `SUBSCRIPTION_SERVICES`.
export const SUBSCRIPTION_SERVICE_PATTERNS = [
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
] as const satisfies readonly {
  slug: (typeof SUBSCRIPTION_SERVICE_SLUGS)[number];
  patterns: readonly RegExp[];
}[];
