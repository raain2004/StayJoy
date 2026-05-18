// src/lib/knowledge-base/types.ts

/**
 * Valid section keys for knowledge base sections.
 * Defined here so types.ts is self-contained and available before builder.ts is created.
 * builder.ts (task 2.2) will re-export SectionKey from here or define its own compatible type.
 */
export const VALID_SECTION_KEYS = [
  'general_info',
  'rooms_pricing',
  'policies',
  'amenities',
  'upsell',
  'faq',
  'sister_properties',
] as const

export type SectionKey = typeof VALID_SECTION_KEYS[number]

/**
 * Represents a single knowledge base section as stored in the database.
 * Maps to the `knowledge_base_sections` table.
 */
export interface KnowledgeBaseSection {
  id: string
  property_id: string
  section_key: SectionKey
  title: string
  content: string
  is_active: boolean
  sort_order: number
  updated_at: string
}

/**
 * Partial update payload for a knowledge base section.
 * All fields are optional — only send the fields you want to update.
 * Toggle-only operations send just `is_active`.
 */
export interface SectionUpdate {
  title?: string
  content?: string
  is_active?: boolean
  sort_order?: number
}

/**
 * Request body for the bulk import endpoint `POST /api/knowledge-base/import`.
 * `section_key` is typed as `string` here because validation happens at runtime
 * (invalid keys are skipped and reported in the `skipped` list of ImportResult).
 */
export interface ImportPayload {
  property_id: string
  sections: Array<{
    section_key: string // validated at runtime against VALID_SECTION_KEYS
    title: string
    content: string
  }>
}

/**
 * Response body for the bulk import endpoint.
 * Reports how many sections were created, updated, or skipped due to invalid keys.
 */
export interface ImportResult {
  created: number
  updated: number
  skipped: string[]
}

/**
 * Response body for the n8n endpoint `GET /api/knowledge-base`
 * and the tenant preview endpoint `GET /api/knowledge-base/preview`.
 */
export interface SystemMessageResponse {
  system_message: string
  property_id: string
}

/**
 * Response body for the AI test endpoint `POST /api/ai/test`.
 * Includes the Gemini answer, the system message that was used, and the property ID.
 */
export interface AITestResponse {
  answer: string
  system_message_used: string
  property_id: string
}
