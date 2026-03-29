import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'reco-audio'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const supabase = adminClient()

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const path = formData.get('path') as string | null

  if (!file || !path) {
    return NextResponse.json({ error: 'Missing file or path' }, { status: 400 })
  }

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.find((b) => b.name === BUCKET)) {
    const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (bucketErr) {
      return NextResponse.json({ error: `Bucket creation failed: ${bucketErr.message}` }, { status: 500 })
    }
  }

  const bytes = await file.arrayBuffer()
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ publicUrl })
}
