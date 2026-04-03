import { Suspense } from 'react'
import { fetchHomeFeedServer } from '@/lib/data/recos-server'
import { HomePageClient } from './HomeClient'

/**
 * Server Component wrapper for the home page.
 * Fetches the initial feed server-side so the page arrives pre-rendered with content.
 * The client component handles all interactivity (filters, cards, sheets).
 * If the server fetch fails (no auth, error), passes null and client fetches on mount.
 */
export default async function HomePage() {
  const initialData = await fetchHomeFeedServer()

  return (
    <Suspense>
      <HomePageClient initialData={initialData} />
    </Suspense>
  )
}
