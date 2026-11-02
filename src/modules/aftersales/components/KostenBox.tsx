import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf, formatDatum } from '@/lib/format'
import { tonVonFarbe } from '@/lib/kontakt'
import { useAktion } from '../hooks/useAktion'
import { rechnungAusRapport } from '../services/akte'
import type { Akte } from '../types'
import { Box } from './Box'

/**
 * Rapporte und Verrechnung: je Rapport Datum, wer, Stunden und wie verrechnet wird (Garantie, kostenpflichtig,
 * Kulanz, Wartungsvertrag); kostenpflichtige ohne Rechnung bekommen «Rechnung erstellen» (Entwurf, Recht
 * «finanzen»). Darunter die Rechnungen des Falls mit Stand und Betrag.
 */
export function KostenBox({ akte }: { akte: Akte | undefined }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const verrechnung = useAuswahl('verrechnung')
  const rapporte = akte?.rapporte ?? []
  const rechnungen = akte?.rechnungen ?? []
  const offen = rechnungen.reduce((s, r) => s + (r.status === 'entwurf' ? 0 : r.total_rappen - r.bezahlt_rappen), 0)
  return (
    <Box
      titel={t('service.kosten.titel')}
      rechts={offen > 0 ? t('service.kosten.offen', { betrag: formatChf(offen, { mitWaehrung: true }) }) : null}
    >
      {rapporte.length === 0 && rechnungen.length === 0 && (
        <p className="text-muted-foreground text-xs">{t('service.kosten.leer')}</p>
      )}
      <ul className="flex flex-col gap-2">
        {rapporte.map((r) => {
          const hatRechnung = rechnungen.some((b) => b.rapport_id === r.id)
          return (
            <li key={r.id} className="flex flex-col gap-1 border-b pb-2 last:border-b-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {t('service.verlauf.rapport')} {r.nummer} · {formatDatum(r.datum)}
                </span>
                {r.verrechnung ? (
                  <Badge ton={tonVonFarbe(verrechnung.finde(r.verrechnung)?.farbe)}>
                    {verrechnung.text(r.verrechnung)}
                  </Badge>
                ) : (
                  <Badge>{r.abgeschlossen_am ? '–' : t('service.kosten.inArbeit')}</Badge>
                )}
              </div>
              <span className="text-muted-foreground text-xs">
                {[r.person, r.stunden ? `${String(r.stunden)} h` : null].filter(Boolean).join(' · ')}
              </span>
              {r.verrechnung === 'kostenpflichtig' && r.abgeschlossen_am && !hatRechnung && (
                <Button
                  size="sm"
                  className="self-start"
                  laedt={laeuft}
                  onClick={() => {
                    void aus(
                      async () => {
                        const id = await rechnungAusRapport(r.id)
                        window.location.hash = `#/invoices?rechnung=${id}`
                      },
                      { de: 'Rechnungsentwurf erstellt', fr: 'Projet de facture créé' },
                    )
                  }}
                >
                  <FileText />
                  {t('service.kosten.rechnung')}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {rechnungen.length > 0 && (
        <ul className="flex flex-col gap-1 border-t pt-2">
          {rechnungen.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-2">
              <a href={`#/invoices?rechnung=${b.id}`} className="min-w-0 truncate underline-offset-2 hover:underline">
                {b.nummer ?? t('service.kosten.entwurf')} · {t(`service.kosten.stand.${b.status}`)}
              </a>
              <span className="zahlen font-mono">{formatChf(b.total_rappen, { mitWaehrung: true })}</span>
            </li>
          ))}
        </ul>
      )}
    </Box>
  )
}
