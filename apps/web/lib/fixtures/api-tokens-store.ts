import type { ApiTokenStub } from '@checkion-v3/contracts'
import { paths } from '../paths'

let tokens: ApiTokenStub[] = [
  {
    id: 'tok-1',
    label: 'Local CLI',
    prefix: `${paths.apiTokenPrefix}a1b2`,
    createdAt: '2026-07-01T09:00:00.000Z',
    lastUsedAt: '2026-07-28T08:00:00.000Z',
  },
]

export function listApiTokens(): ApiTokenStub[] {
  return [...tokens]
}
