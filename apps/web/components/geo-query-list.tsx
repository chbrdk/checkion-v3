'use client'

/**
 * Magazine editable query list for GEO launch — Audion PersonaEditableList composition
 * (numbered rows, inline edit, add/remove) + Suggest dialog. Primitives from @msqdx/ui.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { Button, EmptyState, SectionChrome } from '@msqdx/ui'
import { Dialog } from '../lib/msqdx-ui-client'
import {
  mergeQuerySuggestions,
  type GeoQuerySuggestion,
} from '../lib/geo-query-suggest'
import { paths } from '../lib/paths'

type Props = {
  value: string[]
  onChange: (next: string[]) => void
  url: string
  disabled?: boolean
}

export function GeoQueryList({ value, onChange, url, disabled = false }: Props) {
  const baseId = useId()
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestBusy, setSuggestBusy] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [suggestError, setSuggestError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<GeoQuerySuggestion[]>([])
  const [suggestSource, setSuggestSource] = useState<'fixture' | 'openai' | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const skipBlurSave = useRef(false)
  const valueRef = useRef(value)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    if (editingIndex == null) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editingIndex])

  function beginEdit(index: number) {
    if (disabled) return
    setEditingIndex(index)
    setDraft(value[index] ?? '')
  }

  function cancelEdit() {
    skipBlurSave.current = true
    const wasBlank = editingIndex != null && !(value[editingIndex] ?? '').trim()
    if (wasBlank && editingIndex != null) {
      onChange(value.filter((_, i) => i !== editingIndex))
    }
    setEditingIndex(null)
    setDraft('')
  }

  function commitEdit() {
    if (editingIndex == null) return
    const trimmed = draft.trim()
    const previous = (value[editingIndex] ?? '').trim()

    if (!trimmed) {
      if (!previous) {
        onChange(value.filter((_, i) => i !== editingIndex))
        setEditingIndex(null)
        setDraft('')
        return
      }
      cancelEdit()
      return
    }

    if (trimmed === previous) {
      setEditingIndex(null)
      setDraft('')
      return
    }

    onChange(value.map((q, i) => (i === editingIndex ? trimmed : q)))
    setEditingIndex(null)
    setDraft('')
  }

  function onAdd() {
    if (disabled || editingIndex != null) return
    const nextIndex = value.length
    onChange([...value, ''])
    setEditingIndex(nextIndex)
    setDraft('')
  }

  function onRemove(index: number) {
    if (disabled || editingIndex != null) return
    onChange(value.filter((_, i) => i !== index))
  }

  async function loadSuggestions() {
    setSuggestBusy(true)
    setSuggestError(null)
    setSuggestions([])
    setSuggestSource(null)
    try {
      const response = await fetch(paths.routes.apiGeoSuggestQueries, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url,
          existing: valueRef.current,
          max: 4,
        }),
      })
      const data = (await response.json().catch(() => null)) as {
        suggestions?: GeoQuerySuggestion[]
        source?: 'fixture' | 'openai'
        error?: string
      } | null
      if (!response.ok) throw new Error(data?.error || `Suggest failed (${response.status})`)
      setSuggestions(data?.suggestions ?? [])
      setSuggestSource(data?.source ?? null)
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : 'Suggest failed')
    } finally {
      setSuggestBusy(false)
    }
  }

  function openSuggest() {
    if (disabled || editingIndex != null) return
    setSuggestOpen(true)
    void loadSuggestions()
  }

  function acceptOne(item: GeoQuerySuggestion) {
    setAccepting(item.id)
    const next = mergeQuerySuggestions(valueRef.current, [item.title])
    onChange(next)
    valueRef.current = next
    setSuggestions((prev) => prev.filter((s) => s.id !== item.id))
    setAccepting(null)
  }

  function acceptAll() {
    if (!suggestions.length) return
    setAccepting('all')
    const next = mergeQuerySuggestions(
      valueRef.current,
      suggestions.map((s) => s.title),
    )
    onChange(next)
    valueRef.current = next
    setSuggestions([])
    setSuggestOpen(false)
    setAccepting(null)
  }

  const filledCount = value.filter((q) => q.trim()).length
  const nextNum = String(value.length + 1).padStart(2, '0')
  const sourceHint =
    suggestSource === 'openai'
      ? 'OpenAI · live suggestions'
      : suggestSource === 'fixture'
        ? 'Fixture · host-derived defaults (no OPENAI_API_KEY)'
        : null

  return (
    <div className="checkion-geo-query-list" role="group" aria-label="GEO queries">
      <SectionChrome
        quiet
        title="Queries"
        meta={`${filledCount}`}
        as="h3"
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || editingIndex != null}
            onClick={openSuggest}
            aria-label="AI suggest GEO queries"
          >
            Suggest
          </Button>
        }
      />

      {value.length ? (
        <ol className="checkion-magazine-list checkion-geo-query-list__items">
          {value.map((query, index) => {
            const isEditing = editingIndex === index
            const inputId = `${baseId}-query-${index}`
            return (
              <li key={`${baseId}-${index}`} className="checkion-geo-query-list__row">
                <span className="checkion-magazine-list-num" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="checkion-geo-query-list__main">
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      id={inputId}
                      className="checkion-geo-query-list__input"
                      value={draft}
                      disabled={disabled}
                      aria-label={`Edit GEO query ${index + 1}`}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => {
                        if (skipBlurSave.current) {
                          skipBlurSave.current = false
                          return
                        }
                        commitEdit()
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          commitEdit()
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          cancelEdit()
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="checkion-geo-query-list__text"
                      onClick={() => beginEdit(index)}
                      disabled={disabled}
                    >
                      {query.trim() ? (
                        query
                      ) : (
                        <span className="checkion-geo-query-list__placeholder">Add prompt…</span>
                      )}
                    </button>
                  )}
                </div>
                {!isEditing ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="checkion-geo-query-list__delete"
                    aria-label={`Remove GEO query ${index + 1}`}
                    disabled={disabled}
                    onClick={() => onRemove(index)}
                  >
                    ×
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ol>
      ) : (
        <EmptyState>
          No queries yet.{' '}
          <button type="button" className="checkion-link" onClick={onAdd} disabled={disabled}>
            Add one
          </button>
        </EmptyState>
      )}

      {value.length > 0 ? (
        <div className="checkion-geo-query-list__foot">
          <button
            type="button"
            className="checkion-geo-query-list__add"
            aria-label="Add GEO query"
            disabled={disabled || editingIndex != null}
            onClick={onAdd}
          >
            <span className="checkion-magazine-list-num" aria-hidden>
              {nextNum}
            </span>
            <span className="checkion-geo-query-list__add-label">Add query</span>
          </button>
        </div>
      ) : null}

      {suggestOpen ? (
        <Dialog
          open
          onClose={() => {
            if (accepting == null) setSuggestOpen(false)
          }}
          className="checkion-geo-suggest-dialog"
          title="Suggest queries"
          actions={
            <>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setSuggestOpen(false)}
                disabled={accepting != null}
              >
                Close
              </Button>
              {suggestions.length > 1 ? (
                <Button
                  type="button"
                  size="md"
                  onClick={acceptAll}
                  disabled={accepting != null || suggestBusy}
                >
                  {accepting === 'all' ? 'Adding…' : 'Add all'}
                </Button>
              ) : null}
            </>
          }
        >
          <p className="checkion-geo-suggest-dialog__lede">
            Prompts an answer engine might use when citing this host.
          </p>
          {sourceHint ? (
            <p className="checkion-geo-suggest-dialog__source" title={sourceHint}>
              {sourceHint}
            </p>
          ) : null}
          {suggestError ? (
            <p className="checkion-geo-suggest-dialog__error" role="alert">
              {suggestError}
            </p>
          ) : null}
          {suggestBusy && !suggestions.length ? (
            <p className="checkion-geo-suggest-dialog__lede">Loading suggestions…</p>
          ) : null}
          {!suggestBusy && !suggestions.length && !suggestError ? (
            <p className="checkion-geo-suggest-dialog__lede">No new suggestions right now.</p>
          ) : null}
          {suggestions.length ? (
            <ul className="checkion-geo-suggest-dialog__list">
              {suggestions.map((item) => (
                <li key={item.id}>
                  <div className="checkion-geo-suggest-dialog__copy">
                    <span className="checkion-geo-suggest-dialog__title">{item.title}</span>
                    {item.description ? <p>{item.description}</p> : null}
                  </div>
                  <Button
                    type="button"
                    size="md"
                    variant="ghost"
                    disabled={accepting != null}
                    onClick={() => acceptOne(item)}
                  >
                    {accepting === item.id ? 'Adding…' : 'Add'}
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </Dialog>
      ) : null}
    </div>
  )
}
