import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mock environment variables ---
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key')

// --- Mock Supabase client ---
const mockGetSession = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
    },
    from: mockFrom,
  })),
}))

// --- Mock buildSystemMessage ---
vi.mock('@/lib/knowledge-base/builder', () => ({
  buildSystemMessage: vi.fn(() => '## Thông Tin Chung\n\nTest system message'),
}))

// --- Mock callLLM ---
const mockCallLLM = vi.fn()
vi.mock('@/lib/llm/provider', () => ({
  callLLM: (...args: unknown[]) => mockCallLLM(...args),
}))

// --- Mock global fetch for Gemini API (fallback for tests that still use it) ---
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { POST } from '../route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/ai/test'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockAdminSession(userId = 'admin-user-123') {
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: userId } } },
  })
}

function mockTenantSession(userId = 'tenant-user-456') {
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: userId } } },
  })
}

function mockUnauthenticated() {
  mockGetSession.mockResolvedValue({
    data: { session: null },
  })
}

function setupGeminiSuccess(answer = 'Phòng đôi có giá 500.000đ/đêm') {
  mockCallLLM.mockResolvedValue({
    answer,
    provider: 'gemini',
    model: 'gemini-2.0-flash-lite',
  })
}

function setupGeminiError(status = 500, statusText = 'Internal Server Error') {
  mockCallLLM.mockRejectedValue(new Error(`All LLM providers failed:\ngemini: Gemini ${status}: ${statusText}`))
}

/**
 * Sets up mocks for a successful admin flow:
 * - users_properties returns admin role
 * - properties table returns the property
 * - knowledge_base_sections returns sections
 * - rooms returns rooms
 */
function setupAdminFullFlow(propertyId = 'prop-123') {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'users_properties') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { property_id: 'admin-prop-999', role: 'admin' },
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'properties') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: propertyId },
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'knowledge_base_sections') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { section_key: 'general_info', title: 'Thông Tin Chung', content: 'Test', is_active: true, sort_order: 0 },
            ],
            error: null,
          }),
        }),
      }
    }
    if (table === 'rooms') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { room_id: 'P101', loai_phong: 'Phòng Đôi', suc_chua: 2, gia_dem: 500000 },
            ],
            error: null,
          }),
        }),
      }
    }
    return {}
  })
}

/**
 * Sets up mocks for a tenant who owns the property being tested.
 */
function setupTenantOwnProperty(propertyId = 'prop-123') {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'users_properties') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { property_id: propertyId, role: 'owner' },
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'properties') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: propertyId },
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'knowledge_base_sections') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }
    }
    if (table === 'rooms') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }
    }
    return {}
  })
}

/**
 * Sets up mocks for a tenant trying to test another property.
 */
function setupTenantOtherProperty() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'users_properties') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { property_id: 'tenant-own-prop', role: 'owner' },
              error: null,
            }),
          }),
        }),
      }
    }
    return {}
  })
}

/**
 * Sets up mocks for property not found.
 */
function setupPropertyNotFound() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'users_properties') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { property_id: 'admin-prop', role: 'admin' },
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'properties') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'not found' },
            }),
          }),
        }),
      }
    }
    return {}
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/ai/test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Requirement 7.1, 7.2, 7.3: Admin + valid property + question → 200 ───

  it('returns 200 with answer for admin with valid property_id and question', async () => {
    mockAdminSession()
    setupAdminFullFlow('prop-123')
    setupGeminiSuccess('Phòng đôi có giá 500.000đ/đêm')

    const request = createPostRequest({
      property_id: 'prop-123',
      question: 'Phòng đôi giá bao nhiêu?',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveProperty('answer', 'Phòng đôi có giá 500.000đ/đêm')
    expect(body).toHaveProperty('system_message_used')
    expect(body).toHaveProperty('property_id', 'prop-123')
  })

  // ─── Requirement 7.6: Tenant + own property → 200 ──────────────────────────

  it('returns 200 for tenant testing their own property', async () => {
    mockTenantSession()
    setupTenantOwnProperty('prop-123')
    setupGeminiSuccess('Câu trả lời từ AI')

    const request = createPostRequest({
      property_id: 'prop-123',
      question: 'Homestay có bể bơi không?',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveProperty('answer', 'Câu trả lời từ AI')
    expect(body).toHaveProperty('system_message_used')
    expect(body).toHaveProperty('property_id', 'prop-123')
  })

  // ─── Requirement 7.6: Tenant + other property → 403 ────────────────────────

  it('returns 403 when tenant tries to test another property', async () => {
    mockTenantSession()
    setupTenantOtherProperty()

    const request = createPostRequest({
      property_id: 'other-prop-789',
      question: 'Phòng đôi giá bao nhiêu?',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toHaveProperty('error', 'Forbidden')
  })

  // ─── Requirement 7.7: Empty question → 400 ─────────────────────────────────

  it('returns 400 when question is empty', async () => {
    mockAdminSession()
    setupAdminFullFlow()

    const request = createPostRequest({
      property_id: 'prop-123',
      question: '',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toHaveProperty('error', 'question is required')
  })

  it('returns 400 when question is whitespace only', async () => {
    mockAdminSession()
    setupAdminFullFlow()

    const request = createPostRequest({
      property_id: 'prop-123',
      question: '   ',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toHaveProperty('error', 'question is required')
  })

  // ─── Requirement 7.4: property_id not found → now handled gracefully ─────

  it('proceeds to LLM even with unknown property_id (no sections/rooms)', async () => {
    mockAdminSession()
    // Setup: admin user, but knowledge_base_sections and rooms return empty
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users_properties') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { property_id: 'admin-prop', role: 'admin' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'knowledge_base_sections') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }
      if (table === 'rooms') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }
      return {}
    })
    setupGeminiSuccess('Xin lỗi, tôi chưa có thông tin.')

    const request = createPostRequest({
      property_id: 'non-existent-prop',
      question: 'Phòng đôi giá bao nhiêu?',
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })

  // ─── Requirement 7.5: LLM error → 502 ──────────────────────────────────────

  it('returns 502 when LLM returns an error', async () => {
    mockAdminSession()
    setupAdminFullFlow('prop-123')
    setupGeminiError(429, 'Too Many Requests')

    const request = createPostRequest({
      property_id: 'prop-123',
      question: 'Phòng đôi giá bao nhiêu?',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body.error).toContain('AI error')
  })

  // ─── Edge case: Unauthenticated → 401 ──────────────────────────────────────

  it('returns 401 when not authenticated', async () => {
    mockUnauthenticated()

    const request = createPostRequest({
      property_id: 'prop-123',
      question: 'Test question',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toHaveProperty('error', 'Unauthorized')
  })
})
