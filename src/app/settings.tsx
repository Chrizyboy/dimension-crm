import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { MODULE } from '@/lib/navigation'
import { hatRecht } from '@/lib/rechte'
import { einstellungen as assistent } from '@/modules/ai'
import { einstellungen as automationen } from '@/modules/automations'
import { einstellungen as spesen } from '@/modules/expenses'
import { einstellungen as posteingang } from '@/modules/inbox'
import { einstellungen as rechnungen } from '@/modules/invoices'
import { einstellungen as handbuch } from '@/modules/knowledge'
import { ALTE_REITER, eigeneBereiche, Einstellungen } from '@/modules/settings'
import { useAnmeldung } from '@/stores/anmeldung'
import type { EinstellungsBereich } from '@/types/einstellungen'

/**
 * Alle Bereiche der Einstellungen. Die Route darf Module zusammensetzen (Module selbst nie gegenseitig);
 * ein neues Modul mit Einstellungen exportiert `einstellungen` in seiner index.ts und wird hier ergänzt.
 */
const BEREICHE: readonly EinstellungsBereich[] = [
  ...eigeneBereiche,
  ...rechnungen,
  ...posteingang,
  ...automationen,
  ...spesen,
  ...assistent,
  ...handbuch,
]

/** Einstellungen an einem Ort, offener Bereich in der Adresse (`?bereich=…`); alte Links mit `?reiter=…` gehen weiter. */
export const Route = createFileRoute('/settings')({
  validateSearch: (s: Record<string, unknown>): { bereich?: string } => {
    const roh =
      typeof s.bereich === 'string' ? s.bereich : typeof s.reiter === 'string' ? ALTE_REITER[s.reiter] : undefined
    return roh && BEREICHE.some((b) => b.id === roh) ? { bereich: roh } : {}
  },
  component: function EinstellungenSeite() {
    const { status, ich } = useAnmeldung()
    const { bereich } = Route.useSearch()
    const navigate = Route.useNavigate()
    // Wer keinen einzigen Bereich sehen darf, bekommt die klare Meldung statt einer leeren Seite.
    // Geschäftsleitung sieht alle Bereiche der Administration, ändert aber nichts (43A).
    if (status === 'angemeldet' && !hatRecht(ich, 'gl') && !BEREICHE.some((b) => hatRecht(ich, b.recht)))
      return <KeinZugriff />
    return (
      <Suspense>
        <Einstellungen
          bereiche={BEREICHE}
          module={MODULE}
          {...(bereich ? { bereich } : {})}
          onBereich={(id) => void navigate({ search: { bereich: id }, replace: true })}
        />
      </Suspense>
    )
  },
})
