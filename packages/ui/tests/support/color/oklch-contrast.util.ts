/** Test support: reads OKLCH tokens out of tokens.css and measures WCAG contrast between them. */

export type Rgb = [number, number, number];

const OKLCH = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/;

function toGamma(linear: number): number {
  const value = Math.min(1, Math.max(0, linear));
  return value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
}

function toLinear(gamma: number): number {
  return gamma <= 0.04045 ? gamma / 12.92 : ((gamma + 0.055) / 1.055) ** 2.4;
}

/** `oklch(L C H / A)` to gamma sRGB (0 to 1) and alpha; null when the text is not OKLCH. */
export function parseOklch(text: string): { rgb: Rgb; alpha: number } | null {
  const match = OKLCH.exec(text);
  if (!match) return null;
  const [lightness, chroma, hue] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb: Rgb = [
    toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
  return { rgb, alpha: match[4] === undefined ? 1 : Number(match[4]) };
}

/** Lays a translucent color over an opaque one, in gamma space as the browser does. */
export function composite(top: { rgb: Rgb; alpha: number }, bottom: Rgb): Rgb {
  return top.rgb.map(
    (channel, index) => channel * top.alpha + bottom[index]! * (1 - top.alpha),
  ) as Rgb;
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map(toLinear) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two opaque colors. */
export function contrast(first: Rgb, second: Rgb): number {
  const [light, dark] = [luminance(first), luminance(second)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

/** The custom properties of one theme block of tokens.css: `light` is `:root`, `dark` the dark block. */
export function readTokens(css: string, theme: 'light' | 'dark'): Map<string, string> {
  const darkAt = css.indexOf('[data-theme="dark"] {');
  const block = theme === 'light' ? css.slice(0, darkAt) : css.slice(darkAt);
  const tokens = new Map<string, string>();
  for (const match of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    tokens.set(match[1]!, match[2]!.trim());
  }
  return tokens;
}
