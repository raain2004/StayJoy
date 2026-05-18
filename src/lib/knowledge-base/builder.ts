// src/lib/knowledge-base/builder.ts
//
// Pure functions for building the AI system message from knowledge base sections.
// No side effects — safe to test in isolation.

import { VALID_SECTION_KEYS, SectionKey } from './types'

// Re-export so consumers can import everything from builder.ts
export { VALID_SECTION_KEYS }
export type { SectionKey }

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * A room record from the `rooms` table, projected to the fields needed for
 * building the system message.
 */
export interface Room {
  room_id: string
  loai_phong: string
  suc_chua: number
  gia_dem: number
}

/**
 * A knowledge base section as needed by the builder.
 * Matches the shape returned by the API / Supabase query.
 */
export interface KnowledgeSection {
  section_key: SectionKey
  title: string
  content: string
  is_active: boolean
  sort_order: number
}

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

/**
 * Type guard — returns true when `key` is one of the seven valid section keys.
 */
export function isValidSectionKey(key: string): key is SectionKey {
  return (VALID_SECTION_KEYS as readonly string[]).includes(key)
}

// ---------------------------------------------------------------------------
// Room table formatter
// ---------------------------------------------------------------------------

/**
 * Formats a list of rooms as a markdown table with four columns:
 * Phòng | Loại | Sức chứa | Giá/đêm
 *
 * Returns an empty string when `rooms` is empty (Requirement 8.5).
 */
export function formatRoomsTable(rooms: Room[]): string {
  if (rooms.length === 0) return ''

  const header = '| Phòng | Loại | Sức chứa | Giá/đêm |\n|---|---|---|---|'
  const rows = rooms.map(
    (r) =>
      `| ${r.room_id} | ${r.loai_phong} | ${r.suc_chua} người | ${r.gia_dem.toLocaleString('vi-VN')} đ |`
  )
  return [header, ...rows].join('\n')
}

// ---------------------------------------------------------------------------
// rooms_pricing block helper
// ---------------------------------------------------------------------------

/**
 * Builds the rooms_pricing block that is always injected into the system
 * message whenever there are rooms or active content.
 *
 * Rules (Requirements 8.1–8.5):
 * - Returns null when there are no rooms AND no active content.
 * - Always includes the rooms table when rooms exist.
 * - Appends the section's content only when is_active=true and content is
 *   non-empty (content goes AFTER the rooms table per Requirement 8.3).
 */
export function buildRoomsPricingBlock(
  section: KnowledgeSection | undefined,
  roomsTable: string
): string | null {
  const hasRooms = roomsTable.length > 0
  const hasActiveContent =
    section !== undefined &&
    section.is_active &&
    section.content.trim().length > 0

  if (!hasRooms && !hasActiveContent) return null

  const title = section?.title ?? 'Phòng & Giá'
  const parts: string[] = [`## ${title}`]

  if (hasRooms) parts.push(roomsTable)
  if (hasActiveContent) parts.push(section!.content)

  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// System message builder
// ---------------------------------------------------------------------------

/**
 * Builds the complete system message string from a list of knowledge base
 * sections and a list of rooms.
 *
 * Sorting (Requirement 2.3):
 *   Primary   — sort_order ASC
 *   Secondary — section_key ASC (alphabetical fallback)
 *
 * rooms_pricing handling (Requirements 3.5, 8.1–8.5):
 *   - The rooms table is ALWAYS injected regardless of is_active.
 *   - If is_active=true AND content is non-empty, content is appended after
 *     the rooms table.
 *   - The block appears at its sorted position (not forced to the end).
 *
 * Other sections (Requirement 2.3):
 *   - Skipped when is_active=false.
 *
 * Returns '' when there are no active sections and no rooms.
 */
export function buildSystemMessage(
  sections: KnowledgeSection[],
  rooms: Room[]
): string {
  // Sort: sort_order ASC, then section_key ASC as alphabetical fallback
  const sorted = [...sections].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.section_key.localeCompare(b.section_key)
  })

  const roomsTable = formatRoomsTable(rooms)

  // Find the rooms_pricing section (may be absent)
  const roomsPricingSection = sorted.find(
    (s) => s.section_key === 'rooms_pricing'
  )

  // Pre-compute the rooms_pricing block so we can decide whether to include it
  const roomsBlock = buildRoomsPricingBlock(roomsPricingSection, roomsTable)

  const parts: string[] = []

  // Track whether rooms_pricing has been emitted via the sorted loop
  let roomsPricingEmitted = false

  for (const section of sorted) {
    if (section.section_key === 'rooms_pricing') {
      // Always process rooms_pricing in its sorted position
      if (roomsBlock !== null) {
        parts.push(roomsBlock)
        roomsPricingEmitted = true
      }
      continue
    }

    // All other sections: skip if inactive
    if (!section.is_active) continue

    parts.push(`## ${section.title}\n\n${section.content}`)
  }

  // If rooms_pricing was not in the sorted list but we still have rooms,
  // append the rooms block at the end (edge case: no section record exists)
  if (!roomsPricingEmitted && roomsBlock !== null) {
    parts.push(roomsBlock)
  }

  return parts.join('\n\n---\n\n')
}
