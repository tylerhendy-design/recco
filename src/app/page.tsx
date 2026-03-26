import { redirect } from 'next/navigation'

// Root redirects to onboarding (auth middleware handles session check)
export default function RootPage() {
  redirect('/onboarding')
}
