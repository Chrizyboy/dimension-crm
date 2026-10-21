import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { MeinKonto } from '@/modules/settings'

/** «Mein Konto»: eigenes Profil, für jede angemeldete Person (über das Konto-Menü oben rechts). */
export const Route = createFileRoute('/konto')({
  component: () => (
    <Suspense>
      <MeinKonto />
    </Suspense>
  ),
})
