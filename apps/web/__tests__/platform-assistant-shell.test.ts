import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('checkion platform assistant shell mount', () => {
  it('AppShell mounts host and paths document env key', () => {
    const root = join(__dirname, '..')
    const shell = readFileSync(join(root, 'components/app-shell.tsx'), 'utf8')
    const host = readFileSync(join(root, 'components/platform-assistant-host.tsx'), 'utf8')
    const paths = readFileSync(join(root, 'lib/paths.ts'), 'utf8')
    const appLayout = readFileSync(join(root, 'app/(app)/layout.tsx'), 'utf8')
    expect(shell).toContain('PlatformAssistantHost')
    expect(shell).toContain('AssistantPageContextProvider')
    expect(shell).toContain('ShellBrandCorner')
    expect(shell).not.toContain('topbar={')
    expect(appLayout).toContain('AppShell')
    expect(host).toContain('postPlatformAssistantTheme')
    expect(host).toContain('postPlatformAssistantContext')
    expect(host).toContain('assistant:ready')
    expect(host).toContain('IconChat')
    expect(host).toContain('embedSrcLockedRef')
    expect(host).toContain('headerActions')
    expect(paths).toContain('envPlexonPublicUrl')
    expect(paths).toContain('NEXT_PUBLIC_PLEXON_URL')
    expect(paths).toContain('ecosystemStagingPlexon')

    const workspace = readFileSync(join(root, 'components/project-panels.tsx'), 'utf8')
    const results = readFileSync(join(root, 'components/result-magazine-shell.tsx'), 'utf8')
    expect(workspace).toContain('AssistantPageContextPublisher')
    expect(results).toContain('AssistantPageContextPublisher')
    expect(results).toContain('ASSISTANT_ENTITY_PAGE_SCAN')
  })
})
