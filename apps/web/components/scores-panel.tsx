import { EmptyState, Hint, RankedList, RankedRow } from '@msqdx/ui'
import type { ScoreCard } from '@checkion-v3/contracts'
import { tipIdForScoreKind } from '../lib/help-tips'
import { worstScore } from '../lib/scan-display'
import { LabelWithTip } from './help-tip'

/** Shared score strip — kept out of result-panels so client surfaces avoid fixture/scan stores. */
export function ScoresPanel({ scores }: { scores: ScoreCard[] }) {
  if (scores.length === 0) {
    return <EmptyState>No score cards yet.</EmptyState>
  }

  const weakestKind = worstScore(scores)?.kind

  return (
    <RankedList hint={<Hint>Read-only category strip — weakest first.</Hint>}>
      {scores.map((score, index) => {
        const tipId = tipIdForScoreKind(score.kind)
        const label = tipId ? (
          <LabelWithTip tipId={tipId}>{score.label}</LabelWithTip>
        ) : (
          score.label
        )
        return (
          <RankedRow
            key={score.kind}
            index={index + 1}
            label={label}
            value={score.value}
            secondary={`/ ${score.max}`}
            barPct={score.value}
            className={score.kind === weakestKind ? 'category-rank-item--weakest' : undefined}
          />
        )
      })}
    </RankedList>
  )
}
