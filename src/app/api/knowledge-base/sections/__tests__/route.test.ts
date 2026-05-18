import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mock environment variables ---
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')

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

// --- Mock isValidSectionKey (for PUT route) ---
vi.mock('@/lib/knowledge-base/builder', () => ({
  isValidSectionKey: vi.fn((key: string) => {
    const validKeys = [
      'general_info', 'rooms_pricing', 'policies',
      'amenities', 'upsell', 'faq', 'sister_properties',
    ]
    return validKeys.includes(key)
  }),
}))

import { GET } from '../route'
import { PUT } from '../../sections/[section_key]/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createGetRequest(): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/knowledge-base/sections'))
}

function createPutRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/knowledge-base/sections/general_info'), {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockAuthenticated(userId = 'user-123') {
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: userId } } },
  })
}

function mockUnauthenticated() {
  mockGetSession.mockResolvedValue({
    data: { session: null },
  })
}

// ---------------------------------------------------------------------------
// GET /api/knowledge-base/sections Tests
// ---------------------------------------------------------------------------

describe('GET /api/knowledge-base/sections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Requirement 5.1: Authenticated → 200 with sections array ──────────────

  it('returns 200 with sections array when authenticated', async () => {
    mockAuthenticated()

    const sectionsData = [
      {
        id: 'sec-1',
        section_key: 'general_info',
        title: 'Thông Tin Chung',
        content: 'Nội dung test',
        is_active: true,
        sort_order: 0,
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]

    // users_properties chain: from → select → eq → single
    const usersPropertiesChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { property_id: 'prop-123' },
            error: null,
          }),
        }),
      }),
    }

    // knowledge_base_sections chain: from → select → eq → order
    const sectionsChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: sectionsData,
            error: null,
          }),
        }),
      }),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users_properties') return usersPropertiesChain
      if (table === 'knowledge_base_sections') return sectionsChain
      return {}
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveProperty('sections')
    expect(body.sections).toHaveLength(1)
    expect(body.sections[0].section_key).toBe('general_info')
  })

  // ─── Requirement 5.5: Unauthenticated → 401 ────────────────────────────────

  it('returns 401 when unauthenticated', async () => {
    mockUnauthenticated()

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toHaveProperty('error', 'Unauthorized')
  })

  // ─── Edge case: No property found → empty sections ─────────────────────────

  it('returns empty sections array when user has no property', async () => {
    mockAuthenticated()

    const usersPropertiesChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }),
      }),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users_properties') return usersPropertiesChain
      return {}
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveProperty('sections')
    expect(body.sections).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// PUT /api/knowledge-base/sections/[section_key] Tests
// ---------------------------------------------------------------------------

describe('PUT /api/knowledge-base/sections/[section_key]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Requirement 5.2, 5.3: Valid section_key + valid content → 200 (upsert) ─

  it('returns 200 with upserted section for valid section_key and content', async () => {
    mockAuthenticated()

    const updatedSection = {
      id: 'sec-1',
      property_id: 'prop-123',
      section_key: 'general_info',
      title: 'Thông Tin Chung',
      content: 'Nội dung mới',
      is_active: true,
      sort_order: 0,
      updated_at: '2024-01-02T00:00:00Z',
    }

    // users_properties chain
    const usersPropertiesChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { property_id: 'prop-123' },
            error: null,
          }),
        }),
      }),
    }

    // Check existing section (found → update path)
    const existingCheckChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'sec-1' },
              error: null,
            }),
          }),
        }),
      }),
    }

    // Update chain
    const updateChain = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedSection,
                error: null,
              }),
            }),
          }),
        }),
      }),
    }

    let knowledgeBaseCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users_properties') return usersPropertiesChain
      if (table === 'knowledge_base_sections') {
        knowledgeBaseCallCount++
        // First call: check existing; Second call: update
        if (knowledgeBaseCallCount === 1) return existingCheckChain
        return updateChain
      }
      return {}
    })

    const request = createPutRequest({
      title: 'Thông Tin Chung',
      content: 'Nội dung mới',
    })

    const response = await PUT(request, { params: { section_key: 'general_info' } })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveProperty('section')
    expect(body.section.content).toBe('Nội dung mới')
  })

  // ─── Requirement 5.2: Invalid section_key → 400 ────────────────────────────

  it('returns 400 for invalid section_key', async () => {
    mockAuthenticated()

    const request = new NextRequest(
      new URL('http://localhost:3000/api/knowledge-base/sections/invalid_key'),
      {
        method: 'PUT',
        body: JSON.stringify({ content: 'Some content' }),
        headers: { 'Content-Type': 'application/json' },
      }
    )

    const response = await PUT(request, { params: { section_key: 'invalid_key' } })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toHaveProperty('error', 'invalid section_key')
  })

  // ─── Requirement 5.2: Content rỗng → 400 ───────────────────────────────────

  it('returns 400 when content is empty', async () => {
    mockAuthenticated()

    const request = createPutRequest({ content: '   ' })

    const response = await PUT(request, { params: { section_key: 'general_info' } })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toHaveProperty('error', 'content is required')
  })

  // ─── Requirement 5.2: Content > 5000 chars → 400 ───────────────────────────

  it('returns 400 when content exceeds 5000 characters', async () => {
    mockAuthenticated()

    const longContent = 'a'.repeat(5001)
    const request = createPutRequest({ content: longContent })

    const response = await PUT(request, { params: { section_key: 'general_info' } })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toHaveProperty('error', 'content exceeds 5000 characters')
  })

  // ─── Requirement 5.6: Section of another property → 403 ────────────────────

  it('returns 403 when user has no property (forbidden)', async () => {
    mockAuthenticated()

    // users_properties returns no property for this user
    const usersPropertiesChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }),
      }),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users_properties') return usersPropertiesChain
      return {}
    })

    const request = createPutRequest({ content: 'Valid content' })

    const response = await PUT(request, { params: { section_key: 'general_info' } })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toHaveProperty('error', 'Forbidden')
  })

  // ─── Requirement 5.5: Unauthenticated → 401 ────────────────────────────────

  it('returns 401 when unauthenticated', async () => {
    mockUnauthenticated()

    const request = createPutRequest({ content: 'Some content' })

    const response = await PUT(request, { params: { section_key: 'general_info' } })
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toHaveProperty('error', 'Unauthorized')
  })
})
