import { NextResponse } from 'next/server'
import { getScan, getScanOverview } from '../../../../../lib/fixtures/scan-store'
import { readScreenshot } from '../../../../../lib/scan/screenshot-storage'

export const runtime = 'nodejs'

const PLACEHOLDER_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
  <rect width="800" height="400" fill="#1a1a1a"/>
  <text x="400" y="180" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" fill="#aaa">Screenshot unavailable</text>
  <text x="400" y="220" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#777">File missing on this instance — re-run the scan to capture again.</text>
</svg>`,
  'utf8',
)

function fileKeyFromScreenshotUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/\/api\/scans\/([^/?#]+)\/screenshot/)
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const scan = await getScan(id)
  if (!scan) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const overview = await getScanOverview(id)
  const keys = [id, fileKeyFromScreenshotUrl(overview?.screenshotUrl)].filter(
    (key, index, all): key is string => Boolean(key) && all.indexOf(key) === index,
  )

  for (const key of keys) {
    const buffer = await readScreenshot(key)
    if (buffer?.length) {
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }
  }

  // Honest empty state — broken <img> alone is worse than a visible placeholder.
  return new NextResponse(new Uint8Array(PLACEHOLDER_SVG), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'X-Screenshot': 'placeholder',
      'Cache-Control': 'no-store',
    },
  })
}
