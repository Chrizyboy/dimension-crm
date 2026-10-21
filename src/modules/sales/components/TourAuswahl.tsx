import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Auswahl } from '@/components/ui/auswahl'
import { Input } from '@/components/ui/input'
import { Checkbox, Switch } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { passtZurSuche } from '@/lib/kontakt'
import { useAussendienst, useRegionen } from '../hooks/useVerkauf'
import type { Geschaeft } from '../types'

/** Stände, aus denen eine Tour gewählt wird; vorgewählt «neu» und «offen» wie in V233 (PIPE_STATUS). */
const TOUR_STAENDE = ['lead_neu', 'lead_offen', 'lead_spaeter', 'termin', 'nach_termin'] as const
const ALLE = '_alle'

interface TourAuswahlProps {
  geschaefte: Geschaeft[]
  gewaehlt: ReadonlySet<string>
  onWahl: (id: string, an: boolean) => void
}

/**
 * Auswahl der Leads für eine Tour: Stand, Person, Region, Suche und «nur ohne Termin».
 * Ein Häkchen setzt den Lead auf die Tour.
 */
export function TourAuswahl({ geschaefte, gewaehlt, onWahl }: TourAuswahlProps) {
  const { t } = useTranslation()
  const staende = useAuswahl('kundenstand')
  const personen = useAussendienst()
  const regionen = useRegionen()
  const [stand, setStand] = useState<string[]>(['lead_neu', 'lead_offen'])
  const [person, setPerson] = useState(ALLE)
  const [region, setRegion] = useState(ALLE)
  const [suche, setSuche] = useState('')
  const [ohneTermin, setOhneTermin] = useState(true)

  const kandidaten = useMemo(
    () =>
      geschaefte
        .filter(
          (g) =>
            g.verkaufschanceId &&
            stand.includes(g.stand) &&
            (person === ALLE || (g.terminPersonId ?? g.personId) === person) &&
            (region === ALLE || g.regionId === region) &&
            (!ohneTermin || !g.terminAm || new Date(g.terminAm) < new Date()) &&
            passtZurSuche(g, suche),
        )
        .sort((a, b) => (a.plz ?? '').localeCompare(b.plz ?? '')),
    [geschaefte, stand, person, region, suche, ohneTermin],
  )
  const anzahl = useMemo(() => {
    const z: Record<string, number> = {}
    for (const g of geschaefte) if (g.verkaufschanceId) z[g.stand] = (z[g.stand] ?? 0) + 1
    return z
  }, [geschaefte])

  return (
    <div className="flex flex-col gap-3">
      <Filterchips
        beschriftung={t('verkauf.tour.stand')}
        optionen={TOUR_STAENDE.map((s) => ({ wert: s, text: staende.text(s), anzahl: anzahl[s] ?? 0 }))}
        gewaehlt={stand}
        onChange={setStand}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-2 left-2.5 size-4"
            aria-hidden="true"
          />
          <Input
            type="search"
            className="pl-8"
            aria-label={t('verkauf.suche')}
            placeholder={t('verkauf.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        </div>
        <label className="text-muted-foreground flex items-center gap-2 text-sm">
          <Switch checked={ohneTermin} onCheckedChange={setOhneTermin} />
          {t('verkauf.tour.ohneTermin')}
        </label>
        <Auswahl
          aria-label={t('verkauf.person')}
          value={person}
          onValueChange={setPerson}
          optionen={[
            { wert: ALLE, text: t('verkauf.allePersonen') },
            ...(personen.data ?? []).map((p) => ({ wert: p.id, text: p.name })),
          ]}
        />
        <Auswahl
          aria-label={t('verkauf.region')}
          value={region}
          onValueChange={setRegion}
          optionen={[
            { wert: ALLE, text: t('verkauf.alleRegionen') },
            ...(regionen.data ?? []).map((r) => ({ wert: r.id, text: `${r.nummer ?? ''} ${r.name}`.trim() })),
          ]}
        />
      </div>
      <ul className="bg-surface max-h-80 overflow-y-auto rounded-lg border">
        {kandidaten.length === 0 && <li className="text-muted-foreground p-3 text-sm">{t('verkauf.keineTreffer')}</li>}
        {kandidaten.map((g) => (
          <li key={g.id} className="flex items-center gap-2 border-b px-3 py-1.5 text-sm last:border-b-0">
            <Checkbox
              checked={gewaehlt.has(g.id)}
              disabled={g.breite === null}
              aria-label={g.name}
              onCheckedChange={(an) => {
                onWahl(g.id, an === true)
              }}
            />
            <span className="min-w-0 flex-1 truncate">
              {g.name}{' '}
              <span className="text-muted-foreground text-xs">
                · {[g.plz, g.ort].filter(Boolean).join(' ') || t('verkauf.tour.ohneAdresse')}
              </span>
            </span>
            <span className="text-muted-foreground text-xs">{staende.text(g.stand)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
