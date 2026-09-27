'use client'

import { useEffect, useState } from 'react'

/** Visible page size for home / project Latest-runs columns. */
export const RUN_COLUMN_PAGE_SIZE = 6

/** Max rows kept in memory for in-column “Show more” (matches home fetch window teasers). */
export const RUN_COLUMN_WINDOW = 24

export function usePagedItems<T>(items: T[], pageSize = RUN_COLUMN_PAGE_SIZE) {
  const [visible, setVisible] = useState(pageSize)

  useEffect(() => {
    setVisible(pageSize)
  }, [items, pageSize])

  const shown = items.slice(0, visible)
  const remaining = Math.max(0, items.length - visible)

  return {
    shown,
    remaining,
    hasMore: remaining > 0,
    showMore: () => setVisible((v) => Math.min(v + pageSize, items.length)),
  }
}
