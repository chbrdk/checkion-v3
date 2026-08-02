/** WCAG 2.2 target size (SC 2.5.8) — minimum 24×24 CSS px unless excepted. */
export const WCAG_MIN_TARGET_SIZE_PX = 24;

export function parseTargetSizeFromMessage(message: string): {
  width?: number;
  height?: number;
  minSize?: number;
  partiallyObscured: boolean;
} {
  const text = message.replace(/\s+/g, ' ');
  const sizeMatch = text.match(/(\d+(?:\.\d+)?)px by (\d+(?:\.\d+)?)px/i);
  const minMatch = text.match(/at least (\d+(?:\.\d+)?)px/i);
  return {
    width: sizeMatch ? Number(sizeMatch[1]) : undefined,
    height: sizeMatch ? Number(sizeMatch[2]) : undefined,
    minSize: minMatch ? Number(minMatch[1]) : WCAG_MIN_TARGET_SIZE_PX,
    partiallyObscured: /partially obscured|obscured/i.test(text),
  };
}

export function meetsMinTargetSize(width: number, height: number, minSize = WCAG_MIN_TARGET_SIZE_PX): boolean {
  return width >= minSize && height >= minSize;
}
