import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { MODULE } from '@/lib/navigation'
import { hatRecht } from '@/lib/rechte'
import { Benutzerverwaltung } from '@/modules/settings'
import { useAnmeldung } from '@/stores/anmeldung'

const REITER = new Set(['personen', 'rollen', 'verbindungen', 'sicherung'])

/** Einstellungen: Benutzer, Rollen, Verbindungen und Datensicherung (nur Administration). Reiter in der Adresse (?reiter=…). */
export const Route = createFileRoute('/settings')({
  validateSearch: (s: Record<string, unknown>): { reiter?: string } =>
    typeof s.reiter === 'string' && REITER.has(s.reiter) && s.reiter !== 'personen' ? { reiter: s.reiter } : {},
  component: function EinstellungenSeite() {
    const { status, ich } = useAnmeldung()
    const { reiter } = Route.useSearch()
    const navigate = Route.useNavigate()
    if (status === 'angemeldet' && !hatRecht(ich, 'admin')) return <KeinZugriff />
    return (
      <Suspense>
        <Benutzerverwaltung
          module={MODULE}
          {...(reiter ? { reiter } : {})}
          onReiter={(r) => void navigate({ search: r === 'personen' ? {} : { reiter: r }, replace: true })}
        />
      </Suspense>
    )
  },
})
