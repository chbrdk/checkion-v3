import { describe, expect, it } from 'vitest'
import {
  ASSISTANT_ENTITY_PAGE_SCAN,
  buildCollectionAssistantPageContext,
  normalizeAssistantPlatformProjectId,
} from '../lib/assistant-page-context'
import {
  ASSISTANT_EMBED_PRODUCT,
  buildPlatformAssistantEmbedUrl,
  buildPlatformAssistantExpandUrl,
  mergeAssistantHostPageContext,
  postPlatformAssistantContext,
} from '../lib/platform-assistant-paths'

describe('checkion assistant page context', () => {
  it('normalizes real Collection UUIDs only', () => {
    expect(
      normalizeAssistantPlatformProjectId('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
    ).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')
    expect(normalizeAssistantPlatformProjectId('plx-local-demo')).toBeUndefined()
    expect(normalizeAssistantPlatformProjectId('proj-local-1')).toBeUndefined()
  })

  it('builds collection context without treating local ids as Collection', () => {
    const ctx = buildCollectionAssistantPageContext({
      pathname: '/projects/local-1',
      platformProjectId: 'plx-local-demo',
      entityType: ASSISTANT_ENTITY_PAGE_SCAN,
      entityId: 'scan-1',
    })
    expect(ctx.platformProjectId).toBeUndefined()
    expect(ctx.entityType).toBe(ASSISTANT_ENTITY_PAGE_SCAN)
    expect(ctx.entityId).toBe('scan-1')
    expect(ctx.product).toBe('checkion')
  })

  it('merges published context over host props', () => {
    const merged = mergeAssistantHostPageContext({
      pathname: '/results/scan-1/overview',
      platformProjectId: null,
      published: buildCollectionAssistantPageContext({
        pathname: '/results/scan-1/overview',
        platformProjectId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        entityType: ASSISTANT_ENTITY_PAGE_SCAN,
        entityId: 'scan-1',
      }),
    })
    expect(merged?.platformProjectId).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')
    expect(merged?.entityId).toBe('scan-1')
  })
})

describe('checkion platform assistant paths', () => {
  it('uses checkion product id', () => {
    expect(ASSISTANT_EMBED_PRODUCT).toBe('checkion')
  })

  it('returns null embed when plexon public base unset', () => {
    const prev = process.env.NEXT_PUBLIC_PLEXON_URL
    const prevBase = process.env.NEXT_PLEXON_BASE_URL
    const prevAuth = process.env.PLEXON_AUTH_URL
    delete process.env.NEXT_PUBLIC_PLEXON_URL
    delete process.env.NEXT_PLEXON_BASE_URL
    delete process.env.PLEXON_AUTH_URL
    expect(buildPlatformAssistantEmbedUrl({})).toBeNull()
    process.env.NEXT_PUBLIC_PLEXON_URL = prev
    process.env.NEXT_PLEXON_BASE_URL = prevBase
    process.env.PLEXON_AUTH_URL = prevAuth
  })

  it('builds embed and expand urls from public env', () => {
    const prev = process.env.NEXT_PUBLIC_PLEXON_URL
    process.env.NEXT_PUBLIC_PLEXON_URL = 'https://plexon-v3.example'
    const embed = buildPlatformAssistantEmbedUrl({
      platformProjectId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      pathname: '/scan',
      theme: 'msqdx-dark',
      entityType: ASSISTANT_ENTITY_PAGE_SCAN,
      entityId: 'scan-1',
    })
    expect(embed).toBe(
      'https://plexon-v3.example/assistant/embed?product=checkion&project=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee&pathname=%2Fscan&theme=msqdx-dark&entityType=page_scan&entityId=scan-1',
    )
    expect(
      buildPlatformAssistantEmbedUrl({
        platformProjectId: 'plx-local-demo',
        pathname: '/scan',
      }),
    ).toBe('https://plexon-v3.example/assistant/embed?product=checkion&pathname=%2Fscan')
    expect(
      buildPlatformAssistantExpandUrl('c1', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
    ).toBe('https://plexon-v3.example/assistant?c=c1&project=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')
    process.env.NEXT_PUBLIC_PLEXON_URL = prev
  })

  it('posts assistant:context payload', () => {
    const posts: unknown[] = []
    const frame = {
      postMessage: (data: unknown) => {
        posts.push(data)
      },
    } as unknown as Window
    postPlatformAssistantContext(frame, 'https://plexon-v3.example', {
      product: 'checkion',
      platformProjectId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      pathname: '/projects/x',
    })
    expect(posts[0]).toMatchObject({
      source: 'plexon-assistant-host',
      type: 'assistant:context',
      product: 'checkion',
      platformProjectId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    })
  })
})
