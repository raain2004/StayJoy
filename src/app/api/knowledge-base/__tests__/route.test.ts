import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mock environment variables ---
vi.stubEnv('KNOWLEDGE_BASE_API_KEY', 'test-secret-key')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

// --- Mock @supabase/supabase-js ---
const mockSingle = vi.fn()
const mockEq = vi.fn()
const mockSelect = vi.fn()
const mockFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

// --- Mock buildSystemMessage ---
vi.mock('@/lib/knowledge-base/builder', () => ({
  buildSystemMessage: vi.fn(() => '## Mocked System Message'),
}))

import { GET } from '../route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest(url: string, headers?: Record<string, string>): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    headers: headers ?? {},
  })
}

/**
 * Sets up the Supabase mock chain for a successful flow:
 * 1. chatwoot_inbox_mapping → returns mapping
 * 2. knowledge_base_sections → returns sections
 * 3. rooms → returns rooms
 */
function setupSuccessfulMocks() {
  const mappingResult = { data: { property_id: 'prop-123' }, error: null }
  const sectionsResult = {
    data: [
      { section_key: 'general_info', title: 'Thông Tin Chung', content: 'Nội dung', is_active: true, sort_order: 0 },
    ],
    error: null,
  }
  const roomsResult = {
    data: [
      { room_id: 'P101', loai_phong: 'Phòng Đôi', suc_chua: 2, gia_dem: 500000 },
    ],
    error: null,
  }

  // chatwoot_inbox_mapping query chain: from → select → eq → single
  const mappingChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(mappingResult),
      }),
    }),
  }

  // knowledge_base_sections query chain: from → select → eq → resolves
  const sectionsChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(sectionsResult),
    }),
  }

  // rooms query chain: from → select → eq → resolves
  const roomsChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(roomsResult),
    }),
  }

  // room_images query chain: from → select → eq → order → resolves
  const imagesResult = { data: [], error: null }
  const imagesChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue(imagesResult),
      }),
    }),
  }

  mockFrom.mockImplementation((table: string) => {
    if (table === 'chatwoot_inbox_mapping') return mappingChain
    if (table === 'knowledge_base_sections') return sectionsChain
    if (table === 'rooms') return roomsChain
    if (table === 'room_images') return imagesChain
    return {}
  })
}

/**
 * Sets up the Supabase mock for inbox not found (404).
 */
function setupInboxNotFoundMock() {
  const mappingChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }),
    }),
  }

  mockFrom.mockImplementation((table: string) => {
    if (table === 'chatwoot_inbox_mapping') return mappingChain
    return {}
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/knowledge-base', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Requirement 2.5, 2.6: Valid request → 200 ─────────────────────────────

  it('returns 200 with system_message for valid inbox_id and valid X-API-Key', async () => {
    setupSuccessfulMocks()

    const request = createRequest(
      'http://localhost:3000/api/knowledge-base?inbox_id=inbox-1',
      { 'X-API-Key': 'test-secret-key' }
    )

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveProperty('system_message')
    expect(body).toHaveProperty('property_id', 'prop-123')
  })

  // ─── Requirement 2.5: inbox_id not found → 404 ─────────────────────────────

  it('returns 404 when inbox_id does not exist in chatwoot_inbox_mapping', async () => {
    setupInboxNotFoundMock()

    const request = createRequest(
      'http://localhost:3000/api/knowledge-base?inbox_id=nonexistent',
      { 'X-API-Key': 'test-secret-key' }
    )

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toHaveProperty('error', 'Inbox not found')
  })

  // ─── Requirement 2.7: Missing X-API-Key → 401 ──────────────────────────────

  it('returns 401 when X-API-Key header is missing', async () => {
    const request = createRequest(
      'http://localhost:3000/api/knowledge-base?inbox_id=inbox-1'
      // No headers
    )

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toHaveProperty('error', 'Unauthorized')
  })

  // ─── Requirement 2.7: Wrong X-API-Key → 401 ────────────────────────────────

  it('returns 401 when X-API-Key header has wrong value', async () => {
    const request = createRequest(
      'http://localhost:3000/api/knowledge-base?inbox_id=inbox-1',
      { 'X-API-Key': 'wrong-key' }
    )

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toHaveProperty('error', 'Unauthorized')
  })

  // ─── Edge case: missing inbox_id query param → 404 ─────────────────────────

  it('returns 404 when inbox_id query param is missing', async () => {
    const request = createRequest(
      'http://localhost:3000/api/knowledge-base',
      { 'X-API-Key': 'test-secret-key' }
    )

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toHaveProperty('error', 'Inbox not found')
  })
})
