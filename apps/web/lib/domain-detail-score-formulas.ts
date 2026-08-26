/** Locale key ids for Domain Detail report band / ledger formulas (`domain.detail.formulas.*`). */

export const DOMAIN_DETAIL_FORMULA_IDS = [
  'ledger',
  'corpus',
  'performance',
  'seo',
  'ux',
  'eco',
  'links',
  'shield',
  'eeat',
  'geo',
  'infra',
  'class',
  'samples',
] as const

export type DomainDetailFormulaId = (typeof DOMAIN_DETAIL_FORMULA_IDS)[number]

const FORMULA_ID_SET = new Set<string>(DOMAIN_DETAIL_FORMULA_IDS)

/** Normalize a band id / formulaKey to a `domain.detail.formulas.*` leaf, if known. */
export function domainFormulaKeyForBand(id: string): DomainDetailFormulaId | undefined {
  const key = id.replace(/^report-/, '').replace(/\s+/g, '-')
  if (FORMULA_ID_SET.has(key)) return key as DomainDetailFormulaId
  return undefined
}

export function domainFormulaLocalePath(id: string): string | undefined {
  const key = domainFormulaKeyForBand(id)
  return key ? `domain.detail.formulas.${key}` : undefined
}
