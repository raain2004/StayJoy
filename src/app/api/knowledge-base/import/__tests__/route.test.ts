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

// --- Mock isValidSectionKey ---
vi.mock('@/lib/knowledge-base/builder', () => ({
  isValidSectionKey: vi.fn((key: string) => {
    const validKeys = [
      'general_info', 'rooms_pricing', 'policies',
      'amenities', 'upsell', 'faq', 'sister_properties',
    ]
    return validKeys.includes(key)
  }),
}))

import { POST } from '../route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/knowledge-base/import'), {
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

function mockNonAdminSession(userId = 'tenant-user-456') {
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: userId } } },
  })
}

function mockUnauthenticated() {
  mockGetSession.mockResolvedValue({
    data: { session: null },
  })
}

/**
 * Sets up mocks for admin role check + successful upsert flow.
 * @param existingSectionKeys - section_keys that already exist in DB (will be "updated")
 */
function setupAdminWithUpsertMocks(existingSectionKeys: string[] = []) {
  // users_properties chain: from → select → eq → single → returns admin role
  const usersPropertiesChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null,
        }),
      }),
    }),
  }

  // knowledge_base_sections chains for check existing + insert/update
  let kbCallCount = 0
  const createKbChain = (sectionKey: string) => {
    const exists = existingSectionKeys.includes(sectionKey)
    kbCallCount++

    if (kbCallCount % 2 === 1) {
      // Odd calls: check existing
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: exists ? { id: 'existing-id' } : null,
                error: exists ? null : { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      }
    } else {
      // Even calls: insert or update
      if (exists) {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }
      } else {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
    }
  }

  mockFrom.mockImplementation((table: string) => {
    if (table === 'users_properties') return usersPropertiesChain
    if (table === 'knowledge_base_sections') {
      kbCallCount++
      const currentCall = kbCallCount

      // For each section, there are 2 calls: check existing + insert/update
      // We need to determine which section this call is for
      const sectionIndex = Math.floor((currentCall - 1) / 2)
      const isCheckCall = (currentCall - 1) % 2 === 0

      if (isCheckCall) {
        // Check existing call
        // We don't know the section_key here, so we use a generic approach
        // The mock will be called with .select().eq().eq().single()
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(() => {
                  // Check if this section exists based on the existingSectionKeys
                  // Since we can't easily determine which key is being checked,
                  // we'll use the call order
                  const exists = sectionIndex < existingSectionKeys.length
                  return Promise.resolve({
                    data: exists ? { id: `existing-${sectionIndex}` } : null,
                    error: exists ? null : { code: 'PGRST116' },
                  })
                }),
              }),
            }),
          }),
        }
      } else {
        // Insert or update call
        const exists = sectionIndex < existingSectionKeys.length
        if (exists) {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }
        } else {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
      }
    }
    return {}
  })
}

/**
 * Sets up mocks for non-admin role check.
 */
function setupNonAdminMocks() {
  const usersPropertiesChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { role: 'owner' },
          error: null,
        }),
      }),
    }),
  }

  mockFrom.mockImplementation((table: string) => {
    if (table === 'users_properties') return usersPropertiesChain
    return {}
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/knowledge-base/import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Requirement 6.5, 6.6: Admin + valid payload → 200 with counts ─────────

  it('returns 200 with created/updated/skipped counts for admin with valid payload', async () => {
    mockAdminSession()
    setupAdminWithUpsertMocks(['general_info']) // general_info already exists

    const request = createPostRequest({
      property_id: 'prop-123',
      sections: [
        { section_key: 'general_info', title: 'Thông Tin Chung', content: 'Updated content' },
        { section_key: 'policies', title: 'Chính Sách', content: 'New policies content' },
      ],
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveProperty('created')
    expect(body).toHaveProperty('updated')
    expect(body).toHaveProperty('skipped')
    expect(typeof body.created).toBe('number')
    expect(typeof body.updated).toBe('number')
    expect(Array.isArray(body.skipped)).toBe(true)
  })

  // ─── Requirement 6.6: Non-admin → 403 ──────────────────────────────────────

  it('returns 403 when user is not admin', async () => {
    mockNonAdminSession()
    setupNonAdminMocks()

    const request = createPostRequest({
      property_id: 'prop-123',
      sections: [
        { section_key: 'general_info', title: 'Test', content: 'Content' },
      ],
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toHaveProperty('error', 'Forbidden')
  })

  // ─── Requirement 6.5: Invalid section_key → appears in skipped ──────────────

  it('returns skipped list containing invalid section_keys', async () => {
    mockAdminSession()

    // users_properties → admin
    const usersPropertiesChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { role: 'admin' },
            error: null,
          }),
        }),
      }),
    }

    // For the one valid section (general_info): check existing → not found, then insert
    let kbCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users_properties') return usersPropertiesChain
      if (table === 'knowledge_base_sections') {
        kbCallCount++
        if (kbCallCount === 1) {
          // Check existing for general_info → not found
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' },
                  }),
                }),
              }),
            }),
          }
        }
        if (kbCallCount === 2) {
          // Insert new section
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
      }
      return {}
    })

    const request = createPostRequest({
      property_id: 'prop-123',
      sections: [
        { section_key: 'general_info', title: 'Valid', content: 'Valid content' },
        { section_key: 'invalid_key_1', title: 'Invalid', content: 'Should be skipped' },
        { section_key: 'another_bad_key', title: 'Also Invalid', content: 'Also skipped' },
      ],
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.skipped).toContain('invalid_key_1')
    expect(body.skipped).toContain('another_bad_key')
    expect(body.skipped).toHaveLength(2)
    expect(body.created).toBe(1)
  })

  // ─── Requirement 6.7: Empty payload → 400 ──────────────────────────────────

  it('returns 400 when payload has no sections', async () => {
    mockAdminSession()

    const usersPropertiesChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { role: 'admin' },
            error: null,
          }),
        }),
      }),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users_properties') return usersPropertiesChain
      return {}
    })

    const request = createPostRequest({
      property_id: 'prop-123',
      sections: [],
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toHaveProperty('error', 'No valid sections in payload')
  })

  // ─── Requirement 6.7: Payload with only invalid keys → 400 ─────────────────

  it('returns 400 when all section_keys in payload are invalid', async () => {
    mockAdminSession()

    const usersPropertiesChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { role: 'admin' },
            error: null,
          }),
        }),
      }),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users_properties') return usersPropertiesChain
      return {}
    })

    const request = createPostRequest({
      property_id: 'prop-123',
      sections: [
        { section_key: 'bad_key_1', title: 'Bad', content: 'Content' },
        { section_key: 'bad_key_2', title: 'Also Bad', content: 'Content' },
      ],
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toHaveProperty('error', 'No valid sections in payload')
  })

  // ─── Edge case: Unauthenticated → 401 ──────────────────────────────────────

  it('returns 401 when not authenticated', async () => {
    mockUnauthenticated()

    const request = createPostRequest({
      property_id: 'prop-123',
      sections: [
        { section_key: 'general_info', title: 'Test', content: 'Content' },
      ],
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toHaveProperty('error', 'Unauthorized')
  })
})
