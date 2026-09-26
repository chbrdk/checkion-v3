import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(root, '../web')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'next/link': path.resolve(root, 'src/next-link-stub.tsx'),
      '@checkion-v3/contracts': path.resolve(root, '../../packages/contracts/src/index.ts'),
      // Allow importing Checkion web modules from the preview shell
      '@web': webRoot,
    },
  },
  server: {
    port: 5179,
    fs: {
      allow: [
        root,
        webRoot,
        path.resolve(root, '../../packages/contracts'),
        path.resolve(root, '../../../msqdx-ui/packages/ui'),
        path.resolve(root, '../../../msqdx-ui/packages/ui-tokens'),
      ],
    },
  },
})
