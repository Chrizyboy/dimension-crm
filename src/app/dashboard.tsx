import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { darfModul } from '@/lib/rechte'
import {
  BEREICHE,
  Kennzahlen,
  KENNZAHLEN_REITER,
  meta,
  startReiter,
  VERGLEICHE,
  ZEITRAEUME,
  type Bereich,
  type KennzahlenReiter,
  type Vergleich,
  type Zeitraum,
} from '@/modules/dashboard'
import { useAnmeldung } from '@/stores/anmeldung'

interface Suche {
  reiter?: KennzahlenReiter
  zeitraum?: Zeitraum
  bereich?: Bereich
  vergleich?: Vergleich
  person?: string
  /** Monat «JJJJ-MM» aus der Glocke «Monatsbericht»: erstellt das PDF beim Öffnen. */
  bericht?: string
}

/** Prüft einen Wert aus der Adresse gegen eine Liste. */
function aus<T extends string>(liste: readonly T[], wert: unknown): T | undefined {
  return typeof wert === 'string' && (liste as readonly string[]).includes(wert) ? (wert as T) : undefined
}

/** Kennzahlen: Reiter, Zeitraum, Firma, Vergleich und Person in der Adresse (#/dashboard?reiter=finanzen&zeitraum=quartal). */
export const Route = createFileRoute('/dashboard')({
  validateSearch: (s: Record<string, unknown>): Suche => {
    // Alte Adressen mit «betrieb» (bis 2.11.2026) führen in die Abwicklung.
    const reiter = s.reiter === 'betrieb' ? 'abwicklung' : aus(KENNZAHLEN_REITER, s.reiter)
    const zeitraum = aus(ZEITRAEUME, s.zeitraum)
    const bereich = aus(BEREICHE, s.bereich)
    const vergleich = aus(VERGLEICHE, s.vergleich)
    const person = typeof s.person === 'string' && /^[0-9a-f-]{36}$/.test(s.person) ? s.person : undefined
    const bericht = typeof s.bericht === 'string' && /^\d{4}-\d{2}$/.test(s.bericht) ? s.bericht : undefined
    return {
      ...(reiter ? { reiter } : {}),
      ...(zeitraum ? { zeitraum } : {}),
      ...(bereich ? { bereich } : {}),
      ...(vergleich ? { vergleich } : {}),
      ...(person ? { person } : {}),
      ...(bericht ? { bericht } : {}),
    }
  },
  component: function KennzahlenSeite() {
    const suche = Route.useSearch()
    const navigate = Route.useNavigate()
    const ich = useAnmeldung((z) => z.ich)
    if (!darfModul(meta, ich)) return <KeinZugriff />
    const start = startReiter(ich)
    const auswahl = {
      reiter: suche.reiter ?? start,
      zeitraum: suche.zeitraum ?? 'jahr',
      bereich: suche.bereich ?? 'alle',
      vergleich: suche.vergleich ?? 'vorjahr',
      person: suche.person ?? null,
      bericht: suche.bericht,
    } as const
    return (
      <Suspense>
        <Kennzahlen
          auswahl={auswahl}
          onAuswahl={(a) => {
            const n = { ...auswahl, ...a }
            void navigate({
              search: {
                ...(n.reiter !== start ? { reiter: n.reiter } : {}),
                ...(n.zeitraum !== 'jahr' ? { zeitraum: n.zeitraum } : {}),
                ...(n.bereich !== 'alle' ? { bereich: n.bereich } : {}),
                ...(n.vergleich !== 'vorjahr' ? { vergleich: n.vergleich } : {}),
                ...(n.person ? { person: n.person } : {}),
                ...(n.bericht ? { bericht: n.bericht } : {}),
              },
            })
          }}
        />
      </Suspense>
    )
  },
})
