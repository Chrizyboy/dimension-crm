import { ClipboardCheck, PhoneCall } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatChf, formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { inTagen } from '../lib/anzeige'
import { bestellungAendern } from '../services/bestellungen'
import type { Bestellung, Position } from '../types'

type Feldname = 'tracking' | 'lieferhinweis' | 'kontakt_vor_ort'

/**
 * Auftragsbestätigung und Lieferung einer bestellten Bestellung: AB mit Abweichungen, Tracking, Hinweis für die
 * Anlieferung, Kontakt vor Ort, Lieferscheine und «nachgefragt» (wenn die AB ausbleibt).
 */
export function AbLieferung({
  bestellung: b,
  positionen,
  onAb,
}: {
  bestellung: Bestellung
  positionen: Position[]
  onAb: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  if (!b.bestellt_am || b.status === 'storniert') return null
  const offen = b.status !== 'geliefert'
  const abweichungen = positionen.filter(
    (p) =>
      (p.ab_menge != null && p.ab_menge !== p.menge) ||
      (p.ab_ek_rappen != null && p.ek_rappen != null && p.ab_ek_rappen !== p.ek_rappen),
  ).length
  const feld = (name: Feldname, label: string) => (
    <Angabe label={label}>
      {offen ? (
        <Input
          aria-label={label}
          defaultValue={b[name] ?? ''}
          onBlur={(e) => {
            const w = e.target.value.trim() || null
            if (w !== b[name]) void aus(() => bestellungAendern(b.id, { [name]: w }))
          }}
        />
      ) : (
        (b[name] ?? '–')
      )}
    </Angabe>
  )

  return (
    <AkteAbschnitt
      titel={t('einkauf.ab.abschnitt')}
      zusatz={b.ab_nummer ? t('einkauf.ab.erfasst') : t('einkauf.ab.fehlt')}
    >
      <div className="flex flex-col gap-2">
        {b.ab_nummer ? (
          <dl>
            <Angabe label={t('einkauf.ab.nummer')}>
              {b.ab_nummer}
              {b.ab_am && <span className="text-muted-foreground"> · {formatDatum(b.ab_am)}</span>}
            </Angabe>
            <Angabe label={t('einkauf.ab.termin')}>{b.ab_termin ? formatDatum(b.ab_termin) : '–'}</Angabe>
            {b.ab_total_rappen != null && (
              <Angabe label={t('einkauf.ab.total')}>CHF {formatChf(b.ab_total_rappen)}</Angabe>
            )}
            <Angabe label={t('einkauf.ab.abweichungen')}>
              <Badge ton={abweichungen ? 'warnung' : 'ok'}>
                {abweichungen ? t('einkauf.ab.anzahl', { count: abweichungen }) : t('einkauf.ab.keine')}
              </Badge>
            </Angabe>
          </dl>
        ) : (
          <p className="text-muted-foreground text-sm">
            {t('einkauf.ab.ausstehend', { datum: formatDatum(b.bestellt_am) })}
            {b.nachgefragt_am && ` ${t('einkauf.ab.nachgefragt', { datum: formatDatum(b.nachgefragt_am) })}`}
          </p>
        )}
        {offen && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={b.ab_nummer ? 'secondary' : 'primary'} onClick={onAb}>
              <ClipboardCheck />
              {b.ab_nummer ? t('einkauf.ab.aendern') : t('einkauf.ab.erfassen')}
            </Button>
            {!b.ab_nummer && (
              <Button
                size="sm"
                variant="ghost"
                laedt={laeuft}
                onClick={() => void aus(() => bestellungAendern(b.id, { nachgefragt_am: inTagen(new Date(), 0) }))}
              >
                <PhoneCall />
                {t('einkauf.ab.nachfragen')}
              </Button>
            )}
          </div>
        )}
        <dl className="mt-2">
          {feld('tracking', t('einkauf.lieferung.tracking'))}
          {feld('lieferhinweis', t('einkauf.lieferung.hinweis'))}
          {feld('kontakt_vor_ort', t('einkauf.lieferung.kontakt'))}
          <Angabe label={t('einkauf.lieferung.lieferscheine')}>
            {b.lieferscheine.length ? b.lieferscheine.join(', ') : '–'}
          </Angabe>
        </dl>
      </div>
    </AkteAbschnitt>
  )
}
