/** Phase 2 stub — LLM page classification deferred to Phase 3. */
import type { PageClassification, ScanResult } from '../types'

export async function classifyPageWithLlm(
  _result: ScanResult,
): Promise<{ classification: PageClassification | null; usage?: { input_tokens: number; output_tokens: number } } | null> {
  return null
}
