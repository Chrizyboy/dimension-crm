import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { formatChf, formatDatum } from '@/lib/format'
import { useAktion } from '../../hooks/useAktion'
import { useTagesbericht } from '../../hooks/useAusschreibungen'
import { useMitbewerber, useRegeln } from '../../hooks/useSubmission'
import { pruefen } from '../../services/submission'
import type { Dossier } from '../../types'
import { Box } from '../Box'

/**
 * Kalkulation: Angebot aus der Submissions-Offerte, Preis pro kWp im Vergleich zu den Mitbewerbern, und ab dem
 * Schwellenwert die Prüfung durch eine zweite Person vor der Eingabe (wer prüfen darf, steht in den Regeln).
 */
export function KalkulationBox({ d }: { d: Dossier }) {
  const { t } = useTranslation()
  const regeln = useRegeln().data
  const darf = useTagesbericht().data?.darf_pruefen ?? false
  const mitbewerber = useMitbewerber().data
  const { laeuft, aus } = useAktion()
  if (d.spur !== 'angebot' || !d.offerte_id) return null
  const betrag = d.angebot_rappen ?? d.schaetzung_rappen
  const proKwp = betrag && d.leistung_kwp ? Math.round(betrag / d.leistung_kwp) : null
  const vergleich = (mitbewerber ?? []).map((m) => m.rappen_pro_kwp).filter((x): x is number => Boolean(x))
  const mittel = vergleich.length ? Math.round(vergleich.reduce((a, b) => a + b, 0) / vergleich.length) : null
  const schwelle = regeln?.pruefen_ab_rappen ?? 10_000_000
  const brauchtPruefung = (betrag ?? 0) >= schwelle
  const offen = d.status === 'teilnahme' || d.status === 'kalkulation'
  return (
    <Box
      titel={t('ausschreibungen.akte.kalkulation')}
      rechts={
        <a href={`#/quotes?offerte=${d.offerte_id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          {t('ausschreibungen.akte.offerteOeffnen')}
        </a>
      }
    >
      <div className="flex items-baseline justify-between gap-2">
        <span>{t(d.angebot_rappen ? 'ausschreibungen.feld.angebot' : 'ausschreibungen.feld.schaetzung')}</span>
        <span className="zahlen font-semibold">{betrag ? formatChf(betrag, { mitWaehrung: true }) : '–'}</span>
      </div>
      {proKwp && (
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-muted-foreground">{t('ausschreibungen.akte.proKwp')}</span>
          <span className="zahlen">
            {formatChf(proKwp, { mitWaehrung: true })}
            {mittel ? ` · ${t('ausschreibungen.akte.mitbewerberMittel', { wert: formatChf(mittel) })}` : ''}
          </span>
        </div>
      )}
      <p className="text-muted-foreground text-xs">{t('ausschreibungen.akte.exklMwst')}</p>
      {brauchtPruefung &&
        (d.pruefung_am ? (
          <Badge ton="ok">{t('ausschreibungen.akte.geprueft', { datum: formatDatum(d.pruefung_am) })}</Badge>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Badge ton="warnung">{t('ausschreibungen.akte.pruefungNoetig', { betrag: formatChf(schwelle) })}</Badge>
            {offen && darf && (
              <Button
                size="sm"
                variant="secondary"
                laedt={laeuft}
                onClick={() => void aus(() => pruefen(d.id), { de: 'Geprüft', fr: 'Contrôlé' })}
              >
                <ShieldCheck />
                {t('ausschreibungen.akte.pruefenKnopf')}
              </Button>
            )}
          </div>
        ))}
    </Box>
  )
}
