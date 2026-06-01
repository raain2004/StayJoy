/**
 * LLM Model Pricing — Extensible pricing table
 *
 * Prices are in USD per 1 million tokens.
 * Add new models here when switching providers or trying alternatives.
 *
 * To add a new model (e.g., Qwen, Deepseek, Mistral):
 *   MODEL_PRICING['deepseek-chat'] = { inputPer1M: 0.14, outputPer1M: 0.28 }
 */

export interface ModelPricing {
  inputPer1M: number   // USD per 1M input tokens
  outputPer1M: number  // USD per 1M output tokens
}

/**
 * Pricing table for supported models.
 * Source: Official pricing pages (as of May 2026)
 *
 * Easy to extend — just add a new key-value pair for any model.
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // --- Google Gemini ---
  'gemini-2.5-flash-lite':    { inputPer1M: 0.10,  outputPer1M: 0.40 },
  'gemini-2.5-flash':         { inputPer1M: 0.15,  outputPer1M: 0.60 },

  // --- OpenAI ---
  'gpt-4o-mini':              { inputPer1M: 0.15,  outputPer1M: 0.60 },
  'gpt-4o':                   { inputPer1M: 2.50,  outputPer1M: 10.00 },

  // --- Groq (Llama) ---
  'llama-3.1-8b-instant':     { inputPer1M: 0.05,  outputPer1M: 0.08 },
  'llama-3.3-70b-versatile':  { inputPer1M: 0.59,  outputPer1M: 0.79 },

  // --- Anthropic ---
  'claude-3-haiku-20240307':  { inputPer1M: 0.25,  outputPer1M: 1.25 },

  // --- Extensible: Add new models below ---
  // 'deepseek-chat':         { inputPer1M: 0.14,  outputPer1M: 0.28 },
  // 'qwen-turbo':            { inputPer1M: 0.10,  outputPer1M: 0.30 },
  // 'mistral-small-latest':  { inputPer1M: 0.10,  outputPer1M: 0.30 },
}

// Fallback pricing for unknown models (conservative estimate)
const FALLBACK_PRICING: ModelPricing = { inputPer1M: 0.15, outputPer1M: 0.60 }

/**
 * Get pricing for a given model name.
 * Returns fallback pricing if model is not in the table.
 */
export function getModelPricing(model: string): ModelPricing {
  return MODEL_PRICING[model] ?? FALLBACK_PRICING
}

/**
 * Estimate cost in USD for a given model and token counts.
 */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = getModelPricing(model)
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M
  return inputCost + outputCost
}

/**
 * Format a USD cost to a human-readable string.
 */
export function formatCostUSD(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  if (cost < 1) return `$${cost.toFixed(3)}`
  return `$${cost.toFixed(2)}`
}
