'use client'

/**
 * Compact GEO launch model picker — selected chips + Add dialog (search + provider).
 * Spec: specs/domain/geo-model-catalog.md
 */

import { useEffect, useId, useMemo, useState } from 'react'
import { Button, Chip, EmptyState, Input, SectionChrome, ToggleGroup } from '@msqdx/ui'
import { Dialog } from '../lib/msqdx-ui-client'
import {
  GEO_MODEL_PROVIDERS,
  countDeferredSelected,
  defaultGeoModelIds,
  providerIsLive,
  resolveSelectedModels,
  sameModelSelection,
  searchCatalogModels,
  toggleModelSelection,
  type GeoModelEntry,
  type GeoModelProvider,
} from '../lib/geo/model-catalog'

type Props = {
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}

function availabilityLabel(model: GeoModelEntry): string {
  return model.liveSupported ? 'Live' : 'Soon'
}

function providerLabel(id: GeoModelProvider): string {
  return GEO_MODEL_PROVIDERS.find((p) => p.id === id)?.label ?? id
}

export function GeoModelPicker({ value, onChange, disabled = false }: Props) {
  const searchId = useId()
  const [addOpen, setAddOpen] = useState(false)
  const [provider, setProvider] = useState<GeoModelProvider | 'all'>('openai')
  const [query, setQuery] = useState('')

  const selected = resolveSelectedModels(value)
  const deferredCount = countDeferredSelected(value)
  const atRecommended = sameModelSelection(value, defaultGeoModelIds())

  const providerOptions = useMemo(
    () => [
      { value: 'all', label: 'All' },
      ...GEO_MODEL_PROVIDERS.map((p) => ({
        value: p.id,
        label: p.label,
        disabled: false as boolean | undefined,
      })),
    ],
    [],
  )

  const candidates = useMemo(
    () =>
      searchCatalogModels({
        provider,
        query,
      }),
    [provider, query],
  )

  useEffect(() => {
    if (!addOpen) return
    const t = window.setTimeout(() => {
      const el = document.getElementById(searchId)
      if (el instanceof HTMLInputElement) el.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [addOpen, searchId])

  function onSuggest() {
    if (disabled) return
    onChange(defaultGeoModelIds())
  }

  function onRemove(id: string) {
    if (disabled) return
    onChange(value.filter((x) => x !== id))
  }

  function onToggleFromDialog(id: string) {
    if (disabled) return
    onChange(toggleModelSelection(value, id))
  }

  function openAdd() {
    if (disabled) return
    setProvider('openai')
    setQuery('')
    setAddOpen(true)
  }

  function closeAdd() {
    setAddOpen(false)
    setQuery('')
  }

  return (
    <div className="checkion-geo-model-picker" role="group" aria-label="GEO models">
      <SectionChrome
        quiet
        title="Models"
        meta={`${value.length}`}
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
      <p className="checkion-geo-model-picker__hint">
        Recommended set starts lean; add engines via search. Live GEO runs OpenAI today —
        other providers stay selectable for upcoming multi-provider runs.
        {deferredCount > 0
          ? ` ${deferredCount} Soon model${deferredCount === 1 ? '' : 's'} won’t be posted until live support lands.`
          : null}
      </p>

      {selected.length > 0 ? (
        <ul className="checkion-geo-model-picker__selected">
          {selected.map((model) => (
            <li key={model.id} className="checkion-geo-model-picker__selected-item">
              <Chip
                static
                size="sm"
                selected
                className="checkion-geo-model-picker__chip"
                title={`${model.id} · ${providerLabel(model.provider)} · ${availabilityLabel(model)}`}
              >
                <span className="checkion-geo-model-picker__chip-label">{model.label}</span>
                <span
                  className={
                    model.liveSupported
                      ? 'checkion-geo-model-picker__avail checkion-geo-model-picker__avail--live'
                      : 'checkion-geo-model-picker__avail'
                  }
                >
                  {availabilityLabel(model)}
                </span>
              </Chip>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="checkion-geo-model-picker__remove"
                aria-label={`Remove ${model.label}`}
                disabled={disabled}
                onClick={() => onRemove(model.id)}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState>
          No models selected.{' '}
          <button type="button" className="checkion-link" onClick={onSuggest} disabled={disabled}>
            Suggest defaults
          </button>
          {' · '}
          <button type="button" className="checkion-link" onClick={openAdd} disabled={disabled}>
            Add model
          </button>
        </EmptyState>
      )}

      {selected.length > 0 ? (
        <div className="checkion-geo-model-picker__foot">
          <button
            type="button"
            className="checkion-geo-model-picker__add"
            aria-label="Add GEO model"
            disabled={disabled}
            onClick={openAdd}
          >
            <span className="checkion-magazine-list-num" aria-hidden>
              +
            </span>
            <span className="checkion-geo-model-picker__add-label">Add model</span>
          </button>
        </div>
      ) : null}

      {addOpen ? (
        <Dialog
          open
          onClose={closeAdd}
          className="checkion-geo-model-add-dialog"
          title="Add model"
          actions={
            <Button type="button" variant="ghost" size="md" onClick={closeAdd}>
              Done
            </Button>
          }
        >
          <p className="checkion-geo-model-add-dialog__lede">
            Catalog stays searchable as providers grow — pick by provider, then model.
            {provider !== 'all' && !providerIsLive(provider as GeoModelProvider)
              ? ' This provider is Soon for live GEO.'
              : null}
          </p>
          <ToggleGroup
            aria-label="Model provider"
            value={provider}
            onChange={(next) => setProvider(next as GeoModelProvider | 'all')}
            options={providerOptions}
          />
          <label className="checkion-geo-model-add-dialog__search" htmlFor={searchId}>
            <span className="sr-only">Search models</span>
            <Input
              id={searchId}
              block
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or id…"
              aria-label="Search models"
              autoComplete="off"
            />
          </label>
          {candidates.length === 0 ? (
            <p className="checkion-geo-model-add-dialog__empty">No models match.</p>
          ) : (
            <ul className="checkion-geo-model-add-dialog__list" role="listbox" aria-label="Catalog models">
              {candidates.map((model) => {
                const selectedNow = value.includes(model.id)
                return (
                  <li key={model.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedNow}
                      className="checkion-geo-model-add-dialog__row"
                      data-selected={selectedNow ? 'true' : 'false'}
                      disabled={disabled}
                      onClick={() => onToggleFromDialog(model.id)}
                    >
                      <span className="checkion-geo-model-add-dialog__copy">
                        <span className="checkion-geo-model-add-dialog__title">{model.label}</span>
                        <span className="checkion-geo-model-add-dialog__meta">
                          {providerLabel(model.provider)} · {model.id}
                          {model.tier ? ` · ${model.tier}` : ''}
                        </span>
                      </span>
                      <span
                        className={
                          model.liveSupported
                            ? 'checkion-geo-model-picker__avail checkion-geo-model-picker__avail--live'
                            : 'checkion-geo-model-picker__avail'
                        }
                      >
                        {selectedNow ? 'Selected' : availabilityLabel(model)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Dialog>
      ) : null}
    </div>
  )
}
