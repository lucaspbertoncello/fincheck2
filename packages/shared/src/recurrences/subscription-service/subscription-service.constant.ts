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
