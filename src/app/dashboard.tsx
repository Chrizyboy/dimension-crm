import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import {
  BEREICHE,
  Kennzahlen,
  KENNZAHLEN_REITER,
  meta,
  ZEITRAEUME,
  type Bereich,
  type KennzahlenReiter,
  type Zeitraum,
} from '@/modules/dashboard'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  reiter?: KennzahlenReiter
  zeitraum?: Zeitraum
  bereich?: Bereich
}

/** Prüft einen Wert aus der Adresse gegen eine Liste. */
function aus<T extends string>(liste: readonly T[], wert: unknown): T | undefined {
  return typeof wert === 'string' && (liste as readonly string[]).includes(wert) ? (wert as T) : undefined
}

/** Kennzahlen: Reiter, Zeitraum und Firma in der Adresse (#/dashboard?reiter=betrieb&zeitraum=quartal). */
export const Route = createFileRoute('/dashboard')({
  validateSearch: (s: Record<string, unknown>): Suche => {
    const reiter = aus(KENNZAHLEN_REITER, s.reiter)
    const zeitraum = aus(ZEITRAEUME, s.zeitraum)
    const bereich = aus(BEREICHE, s.bereich)
    return { ...(reiter ? { reiter } : {}), ...(zeitraum ? { zeitraum } : {}), ...(bereich ? { bereich } : {}) }
  },
  component: function KennzahlenSeite() {
    const suche = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    const auswahl = {
      reiter: suche.reiter ?? 'verkauf',
      zeitraum: suche.zeitraum ?? 'jahr',
      bereich: suche.bereich ?? 'alle',
    } as const
    return (
      <Suspense>
        <Kennzahlen
          auswahl={auswahl}
          onAuswahl={(a) => {
            const n = { ...auswahl, ...a }
            void navigate({
              search: {
                ...(n.reiter !== 'verkauf' ? { reiter: n.reiter } : {}),
                ...(n.zeitraum !== 'jahr' ? { zeitraum: n.zeitraum } : {}),
                ...(n.bereich !== 'alle' ? { bereich: n.bereich } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
