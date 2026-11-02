import { MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { formatDatum } from '@/lib/format'
import { useUi } from '@/stores/ui'
import { kartenLink, zahl } from '../lib/anzeige'
import type { Grossprojekt } from '../types'
import { SchrittBox, UnterlagenBox, YouderaBox } from './ArbeitBoxen'
import { PunkteAufschluesselung } from './Bewertung'
import { Box, Zeile } from './Box'
import { KontakteBox } from './KontakteBox'
import { ProjektKopf } from './ProjektKopf'
import { RechercheAbschnitt } from './RechercheAbschnitt'
import { RechnerBox } from './RechnerBox'
import { VerantwortlichWahl } from './VerantwortlichWahl'
import { VerlaufBox } from './VerlaufBox'

/** Gebäude in Kürze: Dach, Ertrag, Heizung, Baujahr, Parzelle, EGID, Link zur Karte des Bundes. */
function GebaeudeBox({ g }: { g: Grossprojekt }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const karte = kartenLink(g, sprache)
  return (
    <Box
      titel={t('grossprojekte.akte.gebaeude')}
      rechts={
        karte && (
          <a
            href={karte}
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent-ink inline-flex items-center gap-1 underline"
          >
            <MapPin className="size-3.5" aria-hidden="true" />
            {t('grossprojekte.akte.karte')}
          </a>
        )
      }
    >
      <dl className="flex flex-col gap-1">
        <Zeile label={t('grossprojekte.feld.dachflaeche')}>
          {g.dachflaeche_m2 != null
            ? t('grossprojekte.akte.dach', {
                m2: zahl(g.dachflaeche_m2),
                klasse: g.dach_klasse ? t(`grossprojekte.klasse.${g.dach_klasse}`) : '–',
              })
            : '–'}
        </Zeile>
        <Zeile label={t('grossprojekte.rechner.ertrag')}>
          {g.stromertrag_kwh ? `${zahl(g.stromertrag_kwh)} kWh` : '–'}
        </Zeile>
        <Zeile label={t('grossprojekte.feld.heizung')}>
          {g.heizung
            ? [
                t(`grossprojekte.heizung.${g.heizung}`),
                g.heizung_jahr,
                g.waermeleistung_kw ? `${String(g.waermeleistung_kw)} kW` : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : '–'}
          {g.heizungsersatz && (
            <Badge ton="info" className="ml-2">
              {t('grossprojekte.feld.heizungsersatz')}
            </Badge>
          )}
        </Zeile>
        <Zeile label={t('grossprojekte.feld.nutzung')}>
          {g.nutzung ? t(`grossprojekte.nutzung.${g.nutzung}`) : '–'}
        </Zeile>
        <Zeile label={t('grossprojekte.feld.baujahr')}>{g.baujahr ?? '–'}</Zeile>
        <Zeile label={t('grossprojekte.projekt.parzelleEgid')}>
          <span className="zahlen">{[g.parzelle, g.egid].filter(Boolean).join(' · ') || '–'}</span>
        </Zeile>
        <Zeile label={t('grossprojekte.akte.entschieden')}>
          {g.entschieden_am ? [g.entschieden_von, formatDatum(g.entschieden_am)].filter(Boolean).join(' · ') : '–'}
        </Zeile>
      </dl>
    </Box>
  )
}

/**
 * Projekt-Akte als ganze Seite für bewilligte Grossprojekte, gebaut für die Arbeit bis zum Vertrag: links Gebäude
 * und wer entscheidet, in der Mitte der nächste Schritt und der Verlauf, rechts Rechnung, Unterlagen und Youdera.
 * Oben die Stufen.
 */
export function ProjektSeite({ g, onZurueck }: { g: Grossprojekt; onZurueck: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4">
      <ProjektKopf g={g} onZurueck={onZurueck} />
      <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-[20rem_minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <GebaeudeBox g={g} />
          <KontakteBox g={g} />
          <Box titel={t('grossprojekte.akte.warum')} rechts={t('grossprojekte.punkte', { n: g.punkte })}>
            <PunkteAufschluesselung g={g} />
          </Box>
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:order-last lg:col-span-2 2xl:order-none 2xl:col-span-1">
          <div className="bg-surface rounded-lg border px-3 pt-2">
            <VerantwortlichWahl g={g} />
          </div>
          <SchrittBox key={`${g.naechster_schritt ?? ''}${g.naechster_schritt_am ?? ''}`} g={g} />
          <VerlaufBox id={g.id} />
          <Box titel={t('grossprojekte.recherche.titel')}>
            <RechercheAbschnitt g={g} />
          </Box>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <RechnerBox key={JSON.stringify(g.rechnung)} g={g} />
          <UnterlagenBox g={g} />
          <YouderaBox key={JSON.stringify(g.youdera)} g={g} />
        </div>
      </div>
    </div>
  )
}
