import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer', 'pa11y', 'axe-core'],
  webpack: (config) => {
    const appNodeModules = path.resolve(__dirname, '../../node_modules')
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@checkion-v3/contracts': path.resolve(__dirname, '../../packages/contracts/src/index.ts'),
      '@msqdx/ui': path.resolve(__dirname, './lib/msqdx-ui.ts'),
      '@msqdx/ui-shell': path.resolve(__dirname, './lib/msqdx-ui-shell.ts'),
      '@msqdx/ui/styles.css': path.resolve(__dirname, '../../../msqdx-ui/packages/ui/src/styles.css'),
      '@msqdx/ui-tokens': path.resolve(__dirname, '../../../msqdx-ui/packages/ui-tokens/dist/index.js'),
    }
    // Sibling DS source (NavRail → react-driftkit) must resolve from the app tree —
    // Docker strips msqdx-ui/node_modules before COPY (Coolify OOM).
    config.resolve.modules = [
      appNodeModules,
      ...(Array.isArray(config.resolve.modules)
        ? config.resolve.modules
        : config.resolve.modules
          ? [config.resolve.modules]
          : ['node_modules']),
    ]
    return config
  },
}

export default nextConfig
