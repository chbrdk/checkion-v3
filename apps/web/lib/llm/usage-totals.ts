/** Accumulate OpenAI chat usage for optional usage reporting. */

export type LlmUsageTotals = { input_tokens: number; output_tokens: number }

export function emptyUsageTotals(): LlmUsageTotals {
  return { input_tokens: 0, output_tokens: 0 }
}

export function mergeUsageTotals(into: LlmUsageTotals, from: LlmUsageTotals): void {
  into.input_tokens += from.input_tokens
  into.output_tokens += from.output_tokens
}

export function addOpenAIChatUsage(
  totals: LlmUsageTotals,
  usage: { prompt_tokens?: number; completion_tokens?: number } | null | undefined,
): void {
  if (!usage) return
  totals.input_tokens += usage.prompt_tokens ?? 0
  totals.output_tokens += usage.completion_tokens ?? 0
}
