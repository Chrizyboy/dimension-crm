import { ListChecks, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Filterchips } from '@/components/shared/Filterchips'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatChf, formatDatum } from '@/lib/format'
import { heuteZuerich, montag, plusTage } from '../lib/datum'
import { bewegungen, prioRang } from '../lib/vorschau'
import type { Bewegung, Finanzdaten, Zahlung } from '../types'
import { BewegungZeile, type BewegungAktion } from './BewegungZeile'

const datumVon = (z: Zahlung) => z.geplant_am ?? z.faellig_am

/**
 * Zahlungen (V233): offene nach Dringlichkeit gruppiert (überfällig, diese Woche, nächste Woche, später,
 * ohne Datum), innerhalb nach Betreibung → Mahnung → wichtig, dann Datum. Filter nach Kategorie, «ungeprüft»
 * (aus Excel übernommen) und Suche; bezahlte darunter.
 */
export function Zahlungen({
  daten,
  lohnZeigen,
  onAktion,
  onNeu,
  onZahllauf,
}: {
  daten: Finanzdaten
  lohnZeigen: boolean
  onAktion: (b: Bewegung, a: BewegungAktion) => void
  onNeu: () => void
  onZahllauf: () => void
}) {
  const { t } = useTranslation()
  const [kategorie, setKategorie] = useState('alle')
  const [suche, setSuche] = useState('')
  const heute = heuteZuerich()
  const w0 = plusTage(montag(heute), 6)
  const w1 = plusTage(w0, 7)

  const { offen, bezahlt, kategorien } = useMemo(() => {
    const s = suche.trim().toLowerCase()
    const passt = (z: Zahlung) =>
      (kategorie === 'alle' ||
        (kategorie === 'ungeprueft'
          ? z.quelle === 'excel' && !z.geprueft
          : (z.kategorie ?? 'Sonstiges') === kategorie)) &&
      (!s || [z.firma, z.text, z.rechnung_nr, z.notiz, z.kategorie].join(' ').toLowerCase().includes(s))
    const liste = daten.zahlungen.filter(passt)
    return {
      offen: liste
        .filter((z) => z.status !== 'bezahlt')
        .sort(
          (a, b) =>
            prioRang(a.prioritaet) - prioRang(b.prioritaet) || (datumVon(a) ?? '9').localeCompare(datumVon(b) ?? '9'),
        ),
      bezahlt: liste
        .filter((z) => z.status === 'bezahlt')
        .sort((a, b) => (b.bezahlt_am ?? '').localeCompare(a.bezahlt_am ?? '')),
      kategorien: [...new Set(daten.zahlungen.map((z) => z.kategorie ?? 'Sonstiges'))].sort(),
    }
  }, [daten.zahlungen, kategorie, suche])

  // Dieselben Zeilen wie in der Vorschau (gleiche Schritte), nur für die Zahlungen dieser Liste.
  const zeilen = useMemo(() => {
    const ids = new Set(offen.map((z) => z.id))
    const alle = bewegungen(
      { ...daten, material: [], fixkosten: [], rechnungen: [], tranchen: [], eingaenge: [] },
      heute,
    )
    const nachId = new Map(alle.filter((b) => ids.has(b.id)).map((b) => [b.id, b]))
    return offen.map((z) => nachId.get(z.id)).filter((b): b is Bewegung => Boolean(b))
  }, [offen, daten, heute])

  const gruppen = [
    { titel: t('finanzen.gruppe.ueberfaellig'), liste: zeilen.filter((b) => b.datum && b.datum < heute) },
    {
      titel: t('finanzen.gruppe.dieseWoche'),
      liste: zeilen.filter((b) => b.datum && b.datum >= heute && b.datum <= w0),
    },
    {
      titel: t('finanzen.gruppe.naechsteWoche'),
      liste: zeilen.filter((b) => b.datum && b.datum > w0 && b.datum <= w1),
    },
    { titel: t('finanzen.gruppe.spaeter'), liste: zeilen.filter((b) => b.datum && b.datum > w1) },
    { titel: t('finanzen.gruppe.ohneDatum'), liste: zeilen.filter((b) => !b.datum) },
  ]
  const summe = (l: Bewegung[]) => l.reduce((s, b) => s + b.rappen, 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-muted-foreground text-sm">
          {t('finanzen.zahlungenOffen', {
            count: zeilen.length,
            betrag: formatChf(summe(zeilen), { mitWaehrung: true }),
          })}
        </span>
        <div className="flex flex-wrap gap-2">
          <Input
            aria-label={t('finanzen.suche')}
            placeholder={t('finanzen.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
            className="w-56"
          />
          <Button variant="secondary" onClick={onZahllauf}>
            <ListChecks />
            {t('finanzen.zahllauf.knopf')}
          </Button>
          <Button onClick={onNeu}>
            <Plus />
            {t('finanzen.zahlungNeu')}
          </Button>
        </div>
      </div>
      <Filterchips
        einzeln
        beschriftung={t('finanzen.kategorie')}
        optionen={[
          { wert: 'alle', text: t('finanzen.alle') },
          { wert: 'ungeprueft', text: t('finanzen.ungeprueft') },
          ...kategorien.map((k) => ({ wert: k, text: k })),
        ]}
        gewaehlt={[kategorie]}
        onChange={([k]) => {
          if (k) setKategorie(k)
        }}
      />
      {gruppen.map(
        (g) =>
          g.liste.length > 0 && (
            <AkteAbschnitt
              ebene={2}
              key={g.titel}
              titel={g.titel}
              zusatz={`${String(g.liste.length)} · ${formatChf(summe(g.liste))}`}
            >
              <ul className="divide-y">
                {g.liste.map((b) => (
                  <BewegungZeile key={b.id} b={b} lohnZeigen={lohnZeigen} onAktion={onAktion} />
                ))}
              </ul>
            </AkteAbschnitt>
          ),
      )}
      {zeilen.length === 0 && <p className="text-muted-foreground text-sm">{t('finanzen.keineZahlungen')}</p>}
      {bezahlt.length > 0 && (
        <details className="bg-surface rounded-lg border px-4 py-2">
          <summary className="cursor-pointer text-sm font-medium">
            {t('finanzen.bezahlte', { count: bezahlt.length })}
          </summary>
          <ul className="divide-y text-sm">
            {bezahlt.slice(0, 200).map((z) => (
              <li key={z.id} className="flex flex-wrap justify-between gap-2 py-1.5">
                <span className="line-clamp-2 min-w-0">
                  {z.firma}
                  <span className="text-muted-foreground ml-2 text-xs">
                    {[z.text, z.rechnung_nr].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="zahlen text-muted-foreground text-xs">
                  {z.bezahlt_am ? formatDatum(z.bezahlt_am) : '–'} ·{' '}
                  {z.kategorie === 'Lohn' && !lohnZeigen ? '••••' : formatChf(z.betrag_rappen ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
