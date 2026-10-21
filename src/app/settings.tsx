import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { MODULE } from '@/lib/navigation'
import { hatRecht } from '@/lib/rechte'
import { Benutzerverwaltung } from '@/modules/settings'
import { useAnmeldung } from '@/stores/anmeldung'

/** Einstellungen: Benutzer und Rollen (nur Administration). Weitere Einstellungen folgen mit ihren Phasen. */
export const Route = createFileRoute('/settings')({
  component: function EinstellungenSeite() {
    const { status, ich } = useAnmeldung()
    if (status === 'angemeldet' && !hatRecht(ich, 'admin')) return <KeinZugriff />
    return (
      <Suspense>
        <Benutzerverwaltung module={MODULE} />
      </Suspense>
    )
  },
})
