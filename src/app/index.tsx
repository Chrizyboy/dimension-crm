import { createFileRoute, redirect } from '@tanstack/react-router'

/** Die leere Adresse führt auf «Mein Tag» (wie V233: die App öffnet mit «Heute»). */
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/today' })
  },
})
