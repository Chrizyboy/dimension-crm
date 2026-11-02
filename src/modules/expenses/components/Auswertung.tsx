import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Filterchips } from '@/components/shared/Filterchips'
import { formatChf } from '@/lib/format'
import { useKategorieText } from '../hooks/useKategorieText'
import { gruppieren, summe } from '../lib/spesen'
import type { Spese } from '../types'
import { Kacheln } from './Kacheln'

const MONATE = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

/** Balken mit Betrag, alle im selben Massstab (grösster Wert = ganze Breite). */
function Balken({ zeilen }: { zeilen: { text: string; rappen: number; zusatz?: string }[] }) {
  const max = Math.max(1, ...zeilen.map((z) => z.rappen))
  return (
    <ul className="flex flex-col gap-2">
      {zeilen.map((z) => (
        <li key={z.text} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
          <span className="truncate" title={z.text}>
            {z.text}
          </span>
          <span className="bg-muted h-2.5 overflow-hidden rounded-full">
            <span
              className="bg-reihe-1 block h-full rounded-full"
              style={{ width: `${String((z.rappen / max) * 100)}%` }}
            />
          </span>
          <span className="zahlen text-right">
            {formatChf(z.rappen)}
            {z.zusatz && <span className="text-muted-foreground ml-1 text-xs">{z.zusatz}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Auswertung (Geschäftsleitung, Buchhaltung): Spesen eines Jahres nach Monat, Kategorie, Person und Projekt.
 * Gezählt wird, was nicht abgelehnt oder zurückgezogen ist, eigenes Geld und Firmenkarte zusammen.
 */
export function Auswertung({ alle }: { alle: Spese[] }) {
  const { t, i18n } = useTranslation()
  const kategorie = useKategorieText()
  const jahre = [...new Set(alle.map((s) => s.datum.slice(0, 4)))].sort().reverse()
  const [jahr, setJahr] = useState(jahre[0] ?? new Date().getFullYear().toString())
  const liste = alle.filter((s) => s.datum.startsWith(jahr) && s.status !== 'abgelehnt' && s.status !== 'storniert')
  const total = summe(liste)
  const monate = MONATE.map((m) => ({ m, rappen: summe(liste.filter((s) => s.datum.slice(5, 7) === m)) }))
  const mitDaten = monate.filter((m) => m.rappen > 0).length
  const projekt = summe(liste.filter((s) => s.projekt_id))
  const firmenkarte = summe(liste.filter((s) => s.bezahlt_mit === 'firmenkarte'))
  const monatName = (m: string) =>
    new Intl.DateTimeFormat(i18n.language === 'fr' ? 'fr-CH' : 'de-CH', { month: 'short' }).format(
      new Date(`${jahr}-${m}-15`),
    )

  return (
    <div className="flex flex-col gap-4">
      {jahre.length > 1 && (
        <Filterchips
          einzeln
          beschriftung={t('spesen.auswertung.jahr')}
          optionen={jahre.map((j) => ({ wert: j, text: j }))}
          gewaehlt={[jahr]}
          onChange={([j]) => {
            if (j) setJahr(j)
          }}
        />
      )}
      <Kacheln
        kacheln={[
          {
            zahl: formatChf(total, { mitWaehrung: true }),
            text: t('spesen.auswertung.total', { jahr, count: liste.length }),
          },
          {
            zahl: formatChf(Math.round(total / Math.max(1, mitDaten)), { mitWaehrung: true }),
            text: t('spesen.auswertung.proMonat'),
          },
          {
            zahl: `${String(total ? Math.round((projekt / total) * 100) : 0)} %`,
            text: t('spesen.auswertung.aufProjekte'),
          },
          { zahl: formatChf(firmenkarte, { mitWaehrung: true }), text: t('spesen.auswertung.firmenkarte') },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <AkteAbschnitt ebene={2} titel={t('spesen.auswertung.nachMonat')}>
          <Balken zeilen={monate.map((m) => ({ text: monatName(m.m), rappen: m.rappen }))} />
        </AkteAbschnitt>
        <AkteAbschnitt ebene={2} titel={t('spesen.auswertung.nachKategorie')}>
          <Balken
            zeilen={gruppieren(liste, (s) => s.kategorie).map((g) => ({
              text: kategorie(g.schluessel),
              rappen: g.rappen,
              zusatz: `(${String(g.anzahl)})`,
            }))}
          />
        </AkteAbschnitt>
        <AkteAbschnitt ebene={2} titel={t('spesen.auswertung.nachPerson')}>
          <Balken
            zeilen={gruppieren(liste, (s) => s.person ?? '–').map((g) => ({
              text: g.schluessel,
              rappen: g.rappen,
              zusatz: `(${String(g.anzahl)})`,
            }))}
          />
        </AkteAbschnitt>
        <AkteAbschnitt ebene={2} titel={t('spesen.auswertung.nachProjekt')}>
          <Balken
            zeilen={gruppieren(liste, (s) =>
              s.projekt_nummer ? [s.projekt_nummer, s.projekt_titel].filter(Boolean).join(' · ') : null,
            )
              .slice(0, 12)
              .map((g) => ({ text: g.schluessel, rappen: g.rappen, zusatz: `(${String(g.anzahl)})` }))}
          />
        </AkteAbschnitt>
      </div>
    </div>
  )
}
