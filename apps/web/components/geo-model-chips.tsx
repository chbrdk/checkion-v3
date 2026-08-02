'use client'

/**
 * Magazine multi-select chips for GEO launch models.
 * Spec: specs/domain/geo-model-catalog.md
 */

import { Button, Chip, SectionChrome } from '@msqdx/ui'
import {
  countDeferredSelected,
  defaultGeoModelIds,
  groupCatalogByProvider,
  sameModelSelection,
  toggleModelSelection,
  type GeoModelEntry,
} from '../lib/geo/model-catalog'

type Props = {
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}

function availabilityLabel(model: GeoModelEntry): string {
  return model.liveSupported ? 'Live' : 'Soon'
}

export function GeoModelChips({ value, onChange, disabled = false }: Props) {
  const groups = groupCatalogByProvider()
  const selectedCount = value.length
  const deferredCount = countDeferredSelected(value)
  const atRecommended = sameModelSelection(value, defaultGeoModelIds())

  function onToggle(id: string) {
    if (disabled) return
    onChange(toggleModelSelection(value, id))
  }

  function onSuggest() {
    if (disabled) return
    onChange(defaultGeoModelIds())
  }

  return (
    <div className="checkion-geo-model-chips" role="group" aria-label="GEO models">
      <SectionChrome
        quiet
        title="Models"
        meta={`${selectedCount}`}
        as="h3"
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || atRecommended}
            onClick={onSuggest}
            aria-label="Suggest default GEO models"
          >
            Suggest
          </Button>
        }
      />
      <p className="checkion-geo-model-chips__hint">
        Toggle answer engines for the query×model matrix. Live GEO runs OpenAI today —
        Anthropic and Google stay selectable for upcoming multi-provider runs.
        {deferredCount > 0
          ? ` ${deferredCount} Soon model${deferredCount === 1 ? '' : 's'} won’t be posted until live support lands.`
          : null}
      </p>

      <div className="checkion-geo-model-chips__groups">
        {groups.map((group) => (
          <section
            key={group.provider}
            className="checkion-geo-model-chips__group"
            aria-label={group.label}
          >
            <header className="checkion-geo-model-chips__provider">
              <span className="checkion-geo-model-chips__provider-name">{group.label}</span>
              <span className="checkion-geo-model-chips__provider-meta">
                {group.models.some((m) => m.liveSupported) ? 'Live' : 'Soon'}
              </span>
            </header>
            <div className="checkion-geo-model-chips__row">
              {group.models.map((model) => {
                const selected = value.includes(model.id)
                return (
                  <Chip
                    key={model.id}
                    size="sm"
                    selected={selected}
                    disabled={disabled}
                    aria-label={`${model.label} (${availabilityLabel(model)})`}
                    title={`${model.id} · ${availabilityLabel(model)}`}
                    onClick={() => onToggle(model.id)}
                  >
                    <span className="checkion-geo-model-chips__chip-label">{model.label}</span>
                    <span
                      className={
                        model.liveSupported
                          ? 'checkion-geo-model-chips__avail checkion-geo-model-chips__avail--live'
                          : 'checkion-geo-model-chips__avail'
                      }
                    >
                      {availabilityLabel(model)}
                    </span>
                  </Chip>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
