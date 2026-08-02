/** WCAG 2.x relative luminance + contrast ratio (shared by tools API and scan filter). */

export type Rgb = { r: number; g: number; b: number };

export function getRelativeLuminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return channel(r) * 0.2126 + channel(g) * 0.7152 + channel(b) * 0.0722;
}

export function contrastRatio(fg: Rgb, bg: Rgb): number {
  const l1 = getRelativeLuminance(fg);
  const l2 = getRelativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function hexToRgb(hex: string): Rgb | null {
  const normalized = hex.replace(/^#/, '').trim();
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/** Parse `rgb()` / `rgba()` — alpha ignored (caller blends separately). */
export function parseCssRgbString(value: string): (Rgb & { a: number }) | null {
  const m = value
    .trim()
    .match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (!m) return null;
  return {
    r: Math.round(Number(m[1])),
    g: Math.round(Number(m[2])),
    b: Math.round(Number(m[3])),
    a: m[4] != null ? Number(m[4]) : 1,
  };
}

export function blendRgb(fg: Rgb & { a: number }, bg: Rgb): Rgb {
  const a = Math.max(0, Math.min(1, fg.a));
  if (a >= 1) return { r: fg.r, g: fg.g, b: fg.b };
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
  };
}

export function isLargeText(fontSizePx: number, fontWeight: number, boldKeyword: boolean): boolean {
  const bold = boldKeyword || fontWeight >= 700;
  return fontSizePx >= 24 || (fontSizePx >= 18.66 && bold);
}

export function requiredAaContrastRatio(largeText: boolean): number {
  return largeText ? 3 : 4.5;
}

/** Extract axe / pa11y contrast details from issue message when present. */
export function parseContrastFromAxeMessage(message: string): {
  ratio: number;
  foreground?: Rgb;
  background?: Rgb;
  fontSizePx?: number;
  fontWeight?: number;
} | null {
  const text = message.replace(/\s+/g, ' ');
  const ratioMatch =
    text.match(/(?:insufficient color contrast|contrast ratio) of ([\d.]+)/i) ??
    text.match(/contrast of ([\d.]+)/i);
  if (!ratioMatch) return null;

  const fgMatch = text.match(/foreground color:\s*(#[0-9a-f]{3,8}|rgb[a]?\([^)]+\))/i);
  const bgMatch = text.match(/background color:\s*(#[0-9a-f]{3,8}|rgb[a]?\([^)]+\))/i);
  const sizeMatch = text.match(/font size:\s*[\d.]+pt\s*\(([\d.]+)px\)/i);
  const weightMatch = text.match(/font weight:\s*(\w+)/i);

  const parseColor = (raw: string): Rgb | undefined => {
    if (raw.startsWith('#')) return hexToRgb(raw) ?? undefined;
    const rgb = parseCssRgbString(raw);
    return rgb ? { r: rgb.r, g: rgb.g, b: rgb.b } : undefined;
  };

  return {
    ratio: Number(ratioMatch[1]),
    foreground: fgMatch ? parseColor(fgMatch[1]) : undefined,
    background: bgMatch ? parseColor(bgMatch[1]) : undefined,
    fontSizePx: sizeMatch ? Number(sizeMatch[1]) : undefined,
    fontWeight: weightMatch?.[1]?.toLowerCase() === 'bold' ? 700 : undefined,
  };
}
