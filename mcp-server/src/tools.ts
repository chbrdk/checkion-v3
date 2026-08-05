/**
 * CHECKION v3 MCP tools — proxy to checkion-v3 BFF with Bearer token.
 * Spec: specs/domain/mcp-server.md
 */
import { z } from 'zod'
import { checkionFetch, isCheckionError } from './checkion-client.js'

function toTextContent(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

type ToolServer = {
  registerTool: (
    name: string,
    config: { title?: string; description?: string; inputSchema?: z.ZodTypeAny },
    cb: (args: unknown) => Promise<{ content: Array<{ type: 'text'; text: string }> }>,
  ) => void
}

async function textResult(path: string, options?: RequestInit) {
  const res = await checkionFetch(path, options)
  return { content: [{ type: 'text' as const, text: toTextContent(res) }] }
}

export const CHECKION_V3_TOOL_NAMES = [
  'checkion_v3.health',
  'checkion_v3.projects_list',
  'checkion_v3.project_get',
  'checkion_v3.project_create',
  'checkion_v3.project_update',
  'checkion_v3.project_delete',
  'checkion_v3.scans_list',
  'checkion_v3.scan_start',
  'checkion_v3.scan_get',
  'checkion_v3.scan_overview',
  'checkion_v3.scan_issues',
  'checkion_v3.scan_scores',
  'checkion_v3.scan_screenshot',
  'checkion_v3.scan_delete',
  'checkion_v3.scan_weakest_signal',
  'checkion_v3.domain_scans_list',
  'checkion_v3.domain_scan_start',
  'checkion_v3.domain_scan_get',
  'checkion_v3.domain_scan_overview',
  'checkion_v3.domain_scan_issues',
  'checkion_v3.domain_scan_control',
  'checkion_v3.domain_scan_seo_reading',
  'checkion_v3.domain_scan_trust_reading',
  'checkion_v3.project_active_domain_scans',
  'checkion_v3.geo_jobs_list',
  'checkion_v3.geo_job_start',
  'checkion_v3.geo_job_get',
  'checkion_v3.geo_suggest_queries',
  'checkion_v3.geo_job_reading',
  'checkion_v3.geo_job_publish_knowledge',
  'checkion_v3.share_create',
  'checkion_v3.share_get',
  'checkion_v3.fetch_page',
] as const

export function registerCheckionV3Tools(server: ToolServer) {
  // --- health ---
  server.registerTool(
    'checkion_v3.health',
    {
      title: 'Health',
      description: 'GET /api/health — checkion-v3 liveness.',
      inputSchema: z.object({}),
    },
    async () => textResult('/api/health'),
  )

  // --- projects ---
  server.registerTool(
    'checkion_v3.projects_list',
    {
      title: 'List projects',
      description: 'GET /api/projects — Collection project summaries.',
      inputSchema: z.object({
        platformProjectId: z.string().optional().describe('Lookup by Plexon Collection id'),
      }),
    },
    async (args) => {
      const { platformProjectId } = args as { platformProjectId?: string }
      const q = platformProjectId
        ? `?platformProjectId=${encodeURIComponent(platformProjectId)}`
        : ''
      return textResult(`/api/projects${q}`)
    },
  )

  server.registerTool(
    'checkion_v3.project_get',
    {
      title: 'Get project',
      description: 'GET /api/projects/:id',
      inputSchema: z.object({ id: z.string() }),
    },
    async (args) => {
      const { id } = args as { id: string }
      return textResult(`/api/projects/${encodeURIComponent(id)}`)
    },
  )

  server.registerTool(
    'checkion_v3.project_create',
    {
      title: 'Create project',
      description: 'POST /api/projects — create Collection project (mirrors to Plexon when federation live).',
      inputSchema: z.object({
        name: z.string(),
        domain: z.string(),
        description: z.string().optional(),
        platformProjectId: z.string().optional(),
      }),
    },
    async (args) =>
      textResult('/api/projects', {
        method: 'POST',
        body: JSON.stringify(args),
      }),
  )

  server.registerTool(
    'checkion_v3.project_update',
    {
      title: 'Update project',
      description: 'PATCH /api/projects/:id',
      inputSchema: z.object({
        id: z.string(),
        name: z.string().optional(),
        domain: z.string().optional(),
        description: z.string().optional(),
      }),
    },
    async (args) => {
      const { id, ...body } = args as {
        id: string
        name?: string
        domain?: string
        description?: string
      }
      return textResult(`/api/projects/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
    },
  )

  server.registerTool(
    'checkion_v3.project_delete',
    {
      title: 'Delete project',
      description: 'DELETE /api/projects/:id',
      inputSchema: z.object({ id: z.string() }),
    },
    async (args) => {
      const { id } = args as { id: string }
      return textResult(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
    },
  )

  // --- scans ---
  server.registerTool(
    'checkion_v3.scans_list',
    {
      title: 'List scans',
      description: 'GET /api/scans — single/deep scan summaries.',
      inputSchema: z.object({
        projectId: z.string().optional(),
      }),
    },
    async (args) => {
      const { projectId } = args as { projectId?: string }
      const q = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
      return textResult(`/api/scans${q}`)
    },
  )

  server.registerTool(
    'checkion_v3.scan_start',
    {
      title: 'Start scan',
      description:
        'POST /api/scans — start WCAG single or deep scan. Deep also creates a domain crawl. Poll scan_get / domain_scan_get.',
      inputSchema: z.object({
        projectId: z.string(),
        url: z.string(),
        mode: z.enum(['single', 'deep']).default('single'),
        waitForCompletion: z.boolean().optional(),
        platformProjectId: z.string().optional(),
        audionRunId: z.string().optional(),
        stepUrl: z.string().optional(),
      }),
    },
    async (args) =>
      textResult('/api/scans', {
        method: 'POST',
        body: JSON.stringify(args),
      }),
  )

  server.registerTool(
    'checkion_v3.scan_get',
    {
      title: 'Get scan',
      description: 'GET /api/scans/:id',
      inputSchema: z.object({ id: z.string() }),
    },
    async (args) => {
      const { id } = args as { id: string }
      return textResult(`/api/scans/${encodeURIComponent(id)}`)
    },
  )

  server.registerTool(
    'checkion_v3.scan_overview',
    {
      title: 'Scan overview',
      description: 'GET /api/scans/:id/overview — magazine overview payload.',
      inputSchema: z.object({ id: z.string() }),
    },
    async (args) => {
      const { id } = args as { id: string }
      return textResult(`/api/scans/${encodeURIComponent(id)}/overview`)
    },
  )

  server.registerTool(
    'checkion_v3.scan_issues',
    {
      title: 'Scan issues',
      description: 'GET /api/scans/:id/issues',
      inputSchema: z.object({ id: z.string() }),
    },
    async (args) => {
      const { id } = args as { id: string }
      return textResult(`/api/scans/${encodeURIComponent(id)}/issues`)
    },
  )

  server.registerTool(
    'checkion_v3.scan_scores',
    {
      title: 'Scan scores',
      description: 'GET /api/scans/:id/scores',
      inputSchema: z.object({ id: z.string() }),
    },
    async (args) => {
      const { id } = args as { id: string }
      return textResult(`/api/scans/${encodeURIComponent(id)}/scores`)
    },
  )

  server.registerTool(
    'checkion_v3.scan_screenshot',
    {
      title: 'Scan screenshot URL',
      description: 'Returns the screenshot API path for a scan (JPEG or placeholder).',
      inputSchema: z.object({ id: z.string() }),
    },
    async (args) => {
      const { id } = args as { id: string }
      const base = (process.env.CHECKION_API_URL ?? '').replace(/\/$/, '')
      return {
        content: [
          {
            type: 'text' as const,
            text: toTextContent({
              url: `${base}/api/scans/${encodeURIComponent(id)}/screenshot`,
              note: 'Fetch with Authorization: Bearer <token>',
            }),
          },
        ],
      }
    },
  )

  server.registerTool(
    'checkion_v3.scan_delete',
    {
      title: 'Delete scan',
      description: 'DELETE /api/scans/:id',
      inputSchema: z.object({ id: z.string() }),
    },
    async (args) => {
      const { id } = args as { id: string }
      return textResult(`/api/scans/${encodeURIComponent(id)}`, { method: 'DELETE' })
    },
  )

  server.registerTool(
    'checkion_v3.scan_weakest_signal',
    {
      title: 'Weakest signal',
      description: 'GET /api/scans/:id/weakest-signal',
      inputSchema: z.object({ id: z.string() }),
    },
    async (args) => {
      const { id } = args as { id: string }
      return textResult(`/api/scans/${encodeURIComponent(id)}/weakest-signal`)
    },
  )

  // --- domain ---
  server.registerTool(
    'checkion_v3.domain_scans_list',
    {
      title: 'List domain scans',
      description: 'GET /api/domain-scans',
      inputSchema: z.object({
        projectId: z.string().optional(),
      }),
    },
    async (args) => {
      const { projectId } = args as { projectId?: string }
      const q = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
      return textResult(`/api/domain-scans${q}`)
    },
  )

  server.registerTool(
    'checkion_v3.domain_scan_start',
    {
      title: 'Start domain crawl',
      description: 'POST /api/domain-scans — async deep crawl. Poll domain_scan_get; use domain_scan_control for pause/resume/cancel.',
      inputSchema: z.object({
        projectId: z.string(),
        url: z.string(),
        maxPages: z.number().optional(),
        useSitemap: z.boolean().optional(),
        waitForCompletion: z.boolean().optional(),
      }),
    },
    async (args) =>
      textResult('/api/domain-scans', {
        method: 'POST',
        body: JSON.stringify(args),
      }),
  )

  server.registerTool(
    'checkion_v3.domain_scan_get',
    {
      title: 'Get domain scan',
      description: 'GET /api/domain-scans/:id — status + progress.',
      inputSchema: z.object({ id: z.string() }),
    },
    async (args) => {
      const { id } = args as { id: string }
      return textResult(`/api/domain-scans/${encodeURIComponent(id)}`)
    },
  )

  server.registerTool(
    'checkion_v3.domain_scan_overview',
    {
      title: 'Domain overview',
      description: 'GET /api/domain-scans/:id/overview',
      inputSchema: z.object({ id: z.string() }),
    },
    async (args) => {
      const { id } = args as { id: string }
      return textResult(`/api/domain-scans/${encodeURIComponent(id)}/overview`)
    },
  )

  server.registerTool(
    'checkion_v3.domain_scan_issues',
    {
      title: 'Domain issues',
      description: 'GET /api/domain-scans/:id/issues',
      inputSchema: z.object({ id: z.string() }),
    },
    async (args) => {
      const { id } = args as { id: string }
      return textResult(`/api/domain-scans/${encodeURIComponent(id)}/issues`)
    },
  )

  server.registerTool(
    'checkion_v3.domain_scan_control',
    {
      title: 'Control domain crawl',
      description: 'POST /api/domain-scans/:id/control — pause | resume | cancel (same-process control).',
      inputSchema: z.object({
        id: z.string(),
        action: z.enum(['pause', 'resume', 'cancel']),
      }),
    },
    async (args) => {
      const { id, action } = args as { id: string; action: 'pause' | 'resume' | 'cancel' }
      return textResult(`/api/domain-scans/${encodeURIComponent(id)}/control`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      })
    },
  )

  server.registerTool(
    'checkion_v3.domain_scan_seo_reading',
    {
      title: 'Domain SEO reading',
      description: 'GET /api/domain-scans/:id/seo-reading',
      inputSchema: z.object({ id: z.string() }),
    },
    async (args) => {
      const { id } = args as { id: string }
      return textResult(`/api/domain-scans/${encodeURIComponent(id)}/seo-reading`)
    },
  )

  server.registerTool(
    'checkion_v3.domain_scan_trust_reading',
    {
      title: 'Domain trust reading',
      description: 'GET /api/domain-scans/:id/trust-reading',
      inputSchema: z.object({ id: z.string() }),
    },
    async (args) => {
      const { id } = args as { id: string }
      return textResult(`/api/domain-scans/${encodeURIComponent(id)}/trust-reading`)
    },
  )

  server.registerTool(
    'checkion_v3.project_active_domain_scans',
    {
      title: 'Active domain scans for project',
      description: 'GET /api/projects/:id/domain-scans/active',
      inputSchema: z.object({ projectId: z.string() }),
    },
    async (args) => {
      const { projectId } = args as { projectId: string }
      return textResult(`/api/projects/${encodeURIComponent(projectId)}/domain-scans/active`)
    },
  )

  // --- GEO ---
  server.registerTool(
    'checkion_v3.geo_jobs_list',
    {
      title: 'List GEO jobs',
      description: 'GET /api/geo-jobs',
      inputSchema: z.object({}),
    },
    async () => textResult('/api/geo-jobs'),
  )

  server.registerTool(
    'checkion_v3.geo_job_start',
    {
      title: 'Start GEO job',
      description:
        'POST /api/geo-jobs — requires url or companyName plus queries (or pack seeds). Poll geo_job_get.',
      inputSchema: z.object({
        projectId: z.string().optional(),
        platformProjectId: z.string().optional(),
        url: z.string().optional(),
        companyName: z.string().optional(),
        queries: z.array(z.string()).optional(),
        models: z.array(z.string()).optional(),
        competitors: z.array(z.string()).optional(),
        title: z.string().optional(),
        waitForCompletion: z.boolean().optional(),
      }),
    },
    async (args) =>
      textResult('/api/geo-jobs', {
        method: 'POST',
        body: JSON.stringify(args),
      }),
  )

  server.registerTool(
    'checkion_v3.geo_job_get',
    {
      title: 'Get GEO job',
      description: 'GET /api/geo-jobs/:id',
      inputSchema: z.object({ id: z.string() }),
    },
    async (args) => {
      const { id } = args as { id: string }
      return textResult(`/api/geo-jobs/${encodeURIComponent(id)}`)
    },
  )

  server.registerTool(
    'checkion_v3.geo_suggest_queries',
    {
      title: 'Suggest GEO queries',
      description: 'POST /api/geo/suggest-queries',
      inputSchema: z.object({
        url: z.string().optional(),
        companyName: z.string().optional(),
        projectId: z.string().optional(),
        platformProjectId: z.string().optional(),
        existing: z.array(z.string()).optional(),
        max: z.number().optional(),
      }),
    },
    async (args) =>
      textResult('/api/geo/suggest-queries', {
        method: 'POST',
        body: JSON.stringify(args),
      }),
  )

  server.registerTool(
    'checkion_v3.geo_job_reading',
    {
      title: 'GEO magazine reading',
      description: 'GET /api/geo-jobs/:id/reading?kind=verdict|eeat|placement|queries|query',
      inputSchema: z.object({
        id: z.string(),
        kind: z.enum(['verdict', 'eeat', 'placement', 'queries', 'query']),
        query: z.string().optional(),
      }),
    },
    async (args) => {
      const { id, kind, query } = args as {
        id: string
        kind: string
        query?: string
      }
      let path = `/api/geo-jobs/${encodeURIComponent(id)}/reading?kind=${encodeURIComponent(kind)}`
      if (kind === 'query' && query) {
        path += `&query=${encodeURIComponent(query)}`
      }
      return textResult(path)
    },
  )

  server.registerTool(
    'checkion_v3.geo_job_publish_knowledge',
    {
      title: 'Publish GEO to Knowledge Pack',
      description: 'POST /api/geo-jobs/:id/publish-knowledge',
      inputSchema: z.object({ id: z.string() }),
    },
    async (args) => {
      const { id } = args as { id: string }
      return textResult(`/api/geo-jobs/${encodeURIComponent(id)}/publish-knowledge`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
    },
  )

  // --- share ---
  server.registerTool(
    'checkion_v3.share_create',
    {
      title: 'Create share link',
      description: 'POST /api/share — public overview token for single or domain resource.',
      inputSchema: z.object({
        resourceType: z.enum(['single', 'domain']),
        resourceId: z.string(),
      }),
    },
    async (args) =>
      textResult('/api/share', {
        method: 'POST',
        body: JSON.stringify(args),
      }),
  )

  server.registerTool(
    'checkion_v3.share_get',
    {
      title: 'Get share by resource',
      description: 'GET /api/share?resourceType=&resourceId=',
      inputSchema: z.object({
        resourceType: z.enum(['single', 'domain']),
        resourceId: z.string(),
      }),
    },
    async (args) => {
      const { resourceType, resourceId } = args as {
        resourceType: string
        resourceId: string
      }
      return textResult(
        `/api/share?resourceType=${encodeURIComponent(resourceType)}&resourceId=${encodeURIComponent(resourceId)}`,
      )
    },
  )

  // --- research ---
  server.registerTool(
    'checkion_v3.fetch_page',
    {
      title: 'Fetch page text',
      description: 'POST /api/fetch-page — Chromium innerText excerpt (no WCAG). For AUDION research fallback.',
      inputSchema: z.object({
        url: z.string(),
      }),
    },
    async (args) =>
      textResult('/api/fetch-page', {
        method: 'POST',
        body: JSON.stringify(args),
      }),
  )

  // silence unused import warning if tree-shaken oddly
  void isCheckionError
}
