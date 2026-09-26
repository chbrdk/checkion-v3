'use client'

import { Alert, Chip, SectionChrome, Text } from '@msqdx/ui'
import { useT } from '../lib/user-prefs'
import {
  topicChips,
  type SuggestBriefView,
} from '../lib/seo-market/suggest-brief-ui'

export function SeoSuggestBriefPanel({ view }: { view: SuggestBriefView }) {
  const t = useT()
  const chips = topicChips(view.brief)
  const metaBits = [
    view.brief.category,
    view.pagesFetched > 0
      ? t('seoMarket.workspace.suggestBriefPages', { count: view.pagesFetched })
      : null,
    view.usedKnowledge ? t('seoMarket.workspace.suggestBriefKnowledge') : null,
  ].filter(Boolean)

  return (
    <div className="checkion-seo-suggest-brief" data-section="seo-suggest-brief">
      <SectionChrome
        title={t('seoMarket.workspace.suggestBriefTitle')}
        quiet
        meta={metaBits.join(' · ') || undefined}
      />
      <Text role="body" as="p" className="checkion-seo-suggest-brief__summary">
        {view.brief.summary}
      </Text>
      {chips.length > 0 ? (
        <div className="checkion-seo-suggest-brief__chips" role="list">
          {chips.map((label) => (
            <span key={label} role="listitem">
              <Chip static size="sm">
                {label}
              </Chip>
            </span>
          ))}
        </div>
      ) : null}
      {view.publishedToPack === true ? (
        <Alert tone="ok">{t('seoMarket.workspace.suggestPackPublished')}</Alert>
      ) : null}
      {view.publishedToPack === false && !view.publishError ? (
        <Alert tone="info">{t('seoMarket.workspace.suggestPackSkipped')}</Alert>
      ) : null}
      {view.publishError ? (
        <Alert tone="error">
          {t('seoMarket.workspace.suggestPackError', { detail: view.publishError })}
        </Alert>
      ) : null}
    </div>
  )
}
