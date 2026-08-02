'use client'

import Link from 'next/link'
import { Hint, Panel, SectionChrome, Text } from '@msqdx/ui'
import { DataTable, type DataTableColumn } from '../lib/msqdx-ui-client'
import type { GeoOverview, GeoPositionRow } from '@checkion-v3/contracts'
import { paths } from '../lib/paths'

type MatrixRow = GeoPositionRow & { id: string }

/**
 * Placement evidence via DS DataTable.
 * Custom bar chart removed — candidate for a future DS series chart if needed.
 */
export function GeoPositionDiagram({ overview }: { overview: GeoOverview; compact?: boolean }) {
  const rows: MatrixRow[] = overview.positionMatrix.map((row) => ({
    ...row,
    id: `q-${row.queryIndex}`,
  }))

  const columns: DataTableColumn<MatrixRow>[] = [
    {
      id: 'q',
      header: 'Query',
      cell: (row) => (
        <Link
          href={paths.routes.geoQueriesPrompt(overview.job.id, row.queryText)}
          className="checkion-geo-place-link"
        >
          {row.queryLabel} · {row.queryText}
        </Link>
      ),
      sortValue: (row) => row.queryIndex,
    },
    ...overview.models.map(
      (model): DataTableColumn<MatrixRow> => ({
        id: model,
        header: model,
        align: 'end',
        cell: (row) => {
          const pos = row.positions[model] ?? 0
          return (
            <Link
              href={paths.routes.geoQueriesPrompt(overview.job.id, row.queryText, model)}
              className="checkion-geo-place-cell"
              data-miss={pos === 0 ? 'true' : undefined}
            >
              {pos === 0 ? '—' : String(pos)}
            </Link>
          )
        },
        sortValue: (row) => row.positions[model] ?? 0,
      }),
    ),
  ]

  return (
    <Panel>
      <SectionChrome title="Citation map" meta={overview.targetHost} />
      <Hint>Lower rank is better; — means not cited. Cells open the Queries dossier.</Hint>
      <Text role="meta" as="p">
        Evidence table for {overview.targetHost}.
      </Text>
      <DataTable
        caption={`Citation positions for ${overview.targetHost}`}
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
      />
    </Panel>
  )
}
