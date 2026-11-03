import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { formatChf, formatDatum, formatDatumZeit } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAktion } from '../hooks/useAktion'
import { useRechnungen } from '../hooks/useEinkauf'
import { rechnungSpeichern } from '../services/einkauf'
import type { Bestellung } from '../types'

/**
 * Rechnungsabgleich: die Lieferantenrechnung aus AbaNinja (Kreditoren) zur Bestellung zuordnen und prüfen.
 * Weicht sie mehr als CHF 50 oder 1 % vom Erwarteten ab, verlangt die Datenbank eine Notiz.
 */
export function RechnungAbschnitt({ bestellung: b }: { bestellung: Bestellung }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const offen = !b.rechnung_geprueft_am && ['bestellt', 'teilgeliefert', 'geliefert'].includes(b.status)
  const vorschlaege = useRechnungen(b.id, offen)
  const [wahl, setWahl] = useState<string | null>(b.rechnung_kreditor_id)
  const [notiz, setNotiz] = useState(b.rechnung_notiz ?? '')
  if (!b.bestellt_am || b.status === 'storniert') return null

  const pruefen = () =>
    void aus(
      () => rechnungSpeichern(b.id, { ...(wahl ? { kreditor_id: wahl } : {}), notiz: notiz.trim(), geprueft: true }),
      { de: 'Rechnung geprüft', fr: 'Facture contrôlée' },
    )

  return (
    <AkteAbschnitt
      titel={t('einkauf.rechnung.titel')}
      zusatz={b.rechnung_geprueft_am ? t('einkauf.rechnung.geprueft') : t('einkauf.rechnung.offen')}
      offen={b.status === 'geliefert'}
    >
      {b.rechnung_geprueft_am ? (
        <dl>
          <Angabe label={t('einkauf.rechnung.nummer')}>{b.rechnung_nummer ?? '–'}</Angabe>
          {b.rechnung_rappen != null && (
            <Angabe label={t('einkauf.rechnung.betrag')}>CHF {formatChf(b.rechnung_rappen)}</Angabe>
          )}
          <Angabe label={t('einkauf.rechnung.geprueft')}>
            {[formatDatumZeit(b.rechnung_geprueft_am), b.rechnung_geprueft_von].filter(Boolean).join(' · ')}
          </Angabe>
          {b.rechnung_notiz && <Angabe label={t('einkauf.feld.notiz')}>{b.rechnung_notiz}</Angabe>}
        </dl>
      ) : (
        <div className="flex flex-col gap-2">
          {vorschlaege.data?.length ? (
            <ul className="flex flex-col gap-1.5" aria-label={t('einkauf.rechnung.vorschlaege')}>
              {vorschlaege.data.map((r) => {
                const diff = (r.betrag_rappen ?? 0) - r.erwartet_rappen
                const gross = Math.abs(diff) > Math.max(5000, r.erwartet_rappen / 100)
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      aria-pressed={wahl === r.id}
                      onClick={() => {
                        setWahl(wahl === r.id ? null : r.id)
                      }}
                      className={cn(
                        'hover:border-border-strong flex w-full flex-wrap items-center gap-2 rounded-md border p-2 text-left text-sm',
                        wahl === r.id && 'border-foreground bg-muted/50',
                      )}
                    >
                      <span className="zahlen font-medium">{r.rechnung_nr ?? '–'}</span>
                      {r.rechnung_am && <span className="text-muted-foreground">{formatDatum(r.rechnung_am)}</span>}
                      <span className="zahlen ml-auto">CHF {formatChf(r.betrag_rappen ?? 0)}</span>
                      <Badge ton={gross ? 'warnung' : 'ok'}>
                        {t('einkauf.rechnung.erwartet', { betrag: formatChf(r.erwartet_rappen) })}
                      </Badge>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">{t('einkauf.rechnung.keine')}</p>
          )}
          <Textarea
            rows={2}
            aria-label={t('einkauf.rechnung.notiz')}
            placeholder={t('einkauf.rechnung.notizPlatzhalter')}
            value={notiz}
            onChange={(e) => {
              setNotiz(e.target.value)
            }}
          />
          <div>
            <Button size="sm" laedt={laeuft} disabled={!wahl} onClick={pruefen}>
              <CheckCircle2 />
              {t('einkauf.rechnung.pruefen')}
            </Button>
          </div>
        </div>
      )}
    </AkteAbschnitt>
  )
}
