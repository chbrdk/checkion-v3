declare module 'pa11y' {
  type Pa11yResult = {
    documentTitle?: string
    pageUrl?: string
    issues: Array<{
      code: string
      type: string
      typeCode?: number
      message: string
      context?: string
      selector?: string
      runner?: string
    }>
  }

  type Pa11yOptions = Record<string, unknown>

  export default function pa11y(url: string, options?: Pa11yOptions): Promise<Pa11yResult>
}
