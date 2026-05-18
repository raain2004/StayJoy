import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildSystemMessage, KnowledgeSection, Room } from '@/lib/knowledge-base/builder'

/**
 * Creates a Supabase client with service_role key for server-to-server access.
 * This endpoint is called by n8n (not by browser), so we bypass RLS.
 */
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/knowledge-base
 *
 * n8n endpoint — returns a pre-built system_message for a given inbox_id.
 * Auth: X-API-Key header compared to process.env.KNOWLEDGE_BASE_API_KEY.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.9
 */
export async function GET(request: NextRequest) {
  try {
    // --- Auth: validate X-API-Key header ---
    const apiKey = request.headers.get('X-API-Key')
    if (!apiKey || apiKey !== process.env.KNOWLEDGE_BASE_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // --- Read inbox_id from query params ---
    const { searchParams } = new URL(request.url)
    const inboxId = searchParams.get('inbox_id')

    if (!inboxId) {
      return NextResponse.json({ error: 'Inbox not found' }, { status: 404 })
    }

    const supabase = createServiceClient()

    // --- Lookup property_id from chatwoot_inbox_mapping ---
    const { data: mapping, error: mappingError } = await supabase
      .from('chatwoot_inbox_mapping')
      .select('property_id')
      .eq('inbox_id', inboxId)
      .single()

    if (mappingError || !mapping) {
      return NextResponse.json({ error: 'Inbox not found' }, { status: 404 })
    }

    const propertyId = mapping.property_id

    // --- Query knowledge_base_sections and rooms in parallel ---
    const [sectionsResult, roomsResult, imagesResult] = await Promise.all([
      supabase
        .from('knowledge_base_sections')
        .select('section_key, title, content, is_active, sort_order')
        .eq('property_id', propertyId),
      supabase
        .from('rooms')
        .select('room_id, loai_phong, suc_chua, gia_dem')
        .eq('property_id', propertyId),
      supabase
        .from('room_images')
        .select('room_id, image_url')
        .eq('property_id', propertyId)
        .order('sort_order', { ascending: true }),
    ])

    if (sectionsResult.error) throw sectionsResult.error
    if (roomsResult.error) throw roomsResult.error
    // images query may fail if table doesn't exist yet — graceful fallback
    const roomImages = imagesResult.data ?? []

    const sections: KnowledgeSection[] = sectionsResult.data ?? []
    const rooms: Room[] = roomsResult.data ?? []

    // --- Build system message ---
    let system_message = buildSystemMessage(sections, rooms)

    // --- Append image instruction if rooms have images ---
    if (roomImages.length > 0) {
      // Group images by room_id
      const imagesByRoom: Record<string, string[]> = {}
      for (const img of roomImages) {
        if (!imagesByRoom[img.room_id]) imagesByRoom[img.room_id] = []
        imagesByRoom[img.room_id].push(img.image_url)
      }

      const roomsWithImages = Object.keys(imagesByRoom)
      const imageInstruction = [
        '\n\n---\n\n## Hướng Dẫn Gửi Hình Phòng',
        '',
        'Khi khách hỏi xem hình phòng, hãy trả lời bình thường và thêm tag [SHOW_IMAGES:room_id] vào cuối câu trả lời.',
        `Các phòng có hình: ${roomsWithImages.join(', ')}`,
        '',
        'Ví dụ: "Đây là phòng đôi của chúng tôi, rất thoáng mát ạ. [SHOW_IMAGES:P101]"',
        'Nếu khách hỏi xem tất cả phòng, gửi nhiều tag: [SHOW_IMAGES:P101] [SHOW_IMAGES:P102]',
        'Chỉ dùng tag cho phòng có trong danh sách trên.',
      ].join('\n')

      system_message += imageInstruction
    }

    return NextResponse.json({
      system_message,
      property_id: propertyId,
      // Include room images map for n8n to use when parsing SHOW_IMAGES tags
      room_images: roomImages.length > 0
        ? Object.fromEntries(
            Object.entries(
              roomImages.reduce((acc, img) => {
                if (!acc[img.room_id]) acc[img.room_id] = []
                acc[img.room_id].push(img.image_url)
                return acc
              }, {} as Record<string, string[]>)
            )
          )
        : undefined,
    })
  } catch (error) {
    console.error('[GET /api/knowledge-base]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
