import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/rooms/[id]/images/[imageId]
 * Deletes a room image from Storage and DB.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; imageId: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: roomId, imageId } = params

    // Fetch the image record
    const { data: image, error: fetchError } = await supabase
      .from('room_images')
      .select('id, room_id, property_id, storage_path')
      .eq('id', imageId)
      .eq('room_id', roomId)
      .single()

    if (fetchError || !image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // Verify ownership
    const { data: ownership, error: ownerError } = await supabase
      .from('users_properties')
      .select('property_id')
      .eq('user_id', user.id)
      .eq('property_id', image.property_id)
      .single()

    if (ownerError || !ownership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete from Storage
    const { error: storageError } = await supabase.storage
      .from('room-images')
      .remove([image.storage_path])

    if (storageError) {
      console.error('[DELETE /api/rooms/:id/images/:imageId] Storage error:', storageError)
      // Continue to delete DB record even if storage fails
    }

    // Delete from DB
    const { error: deleteError } = await supabase
      .from('room_images')
      .delete()
      .eq('id', imageId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/rooms/:id/images/:imageId]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
