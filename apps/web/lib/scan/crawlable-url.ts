/**
 * Detect URLs that are downloads / binary media — not HTML pages for WCAG crawls.
 * Spec: specs/domain/scan-crawl-assets.md
 */

/** File extensions that are never useful for accessibility / SEO page scans. */
export const NON_HTML_ASSET_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'odt',
  'ods',
  'rtf',
  'csv',
  'tsv',
  'zip',
  'rar',
  '7z',
  'gz',
  'tgz',
  'tar',
  'bz2',
  'dmg',
  'exe',
  'msi',
  'apk',
  'ipa',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'ico',
  'bmp',
  'tif',
  'tiff',
  'heic',
  'avif',
  'mp3',
  'mp4',
  'm4a',
  'm4v',
  'wav',
  'ogg',
  'webm',
  'mov',
  'avi',
  'mkv',
  'flac',
  'aac',
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot',
  'css',
  'js',
  'mjs',
  'map',
  'json',
  'xml', // sitemaps handled separately; linked .xml feeds are not page scans
  'rss',
  'atom',
] as const

const EXT_RE = new RegExp(
  `\\.(?:${NON_HTML_ASSET_EXTENSIONS.join('|')})(?:$|[?#])`,
  'i',
)

/**
 * Path fragments that almost always host downloads (HDI mediaservice, press PDFs, …).
 * Matched case-insensitively against pathname.
 */
export const NON_HTML_ASSET_PATH_MARKERS = [
  '/mediaservice/',
  '/media/pdf/',
  '/media/image/',
  '/media/images/',
  '/media/download/',
  '/media/downloads/',
  '/media/file/',
  '/media/files/',
  '/media/video/',
  '/media/audio/',
  '/assets/pdf/',
  '/assets/images/',
  '/assets/img/',
  '/assets/media/',
  '/downloads/',
  '/download/',
  '/media-downloads/',
  '/fileadmin/',
  '/_assets/',
  '/static/media/',
] as const

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

/** True when the URL path/extension looks like a non-HTML asset. */
export function isNonHtmlAssetUrl(url: string): boolean {
  const raw = url.trim()
  if (!raw) return false
  if (EXT_RE.test(raw)) return true
  const path = pathnameOf(raw).toLowerCase()
  if (EXT_RE.test(path)) return true
  for (const marker of NON_HTML_ASSET_PATH_MARKERS) {
    if (path.includes(marker)) return true
  }
  // Path ends with media-ish leaf without extension (e.g. /media/pdf/20221117_UM_K-Tarif_HDI)
  if (/\/media\/[^/]+\/[^/]+$/i.test(path) && !/\.[a-z0-9]{1,5}$/i.test(path)) {
    if (/\/media\/(pdf|image|images|img|download|downloads|file|files|video|audio)\//i.test(path)) {
      return true
    }
  }
  return false
}

/** Spider should not enqueue / navigate to this URL. */
export function shouldSkipCrawlUrl(url: string): boolean {
  return isNonHtmlAssetUrl(url)
}
