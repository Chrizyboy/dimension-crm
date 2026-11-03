import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { mitMwst, useMwst } from '@/hooks/useMwst'
import { formatChf } from '@/lib/format'
import { rabattProzent } from '../lib/tarif'

/**
 * Jahrespreis: Vorschlag aus dem Tarif der Website, änderbar (Entscheid Chris 1B). Ein tieferer Preis gilt als
 * Rabatt und wird markiert. Darunter MWST und Total inkl. MWST, wie es der Kunde bezahlt.
 */
export function PreisBox({
  tarifRappen,
  tarifText,
  wert,
  preisRappen,
  fehler,
  onChange,
}: {
  tarifRappen: number | null
  tarifText: string
  wert: string
  preisRappen: number | null
  fehler?: string | undefined
  onChange: (text: string) => void
}) {
  const { t } = useTranslation()
  const satz = useMwst()
  const rabatt = rabattProzent(tarifRappen, preisRappen)
  const inkl = preisRappen != null ? mitMwst(preisRappen, satz) : null
  return (
    <div className="bg-surface-2 flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{tarifText}</span>
        <span className="zahlen">
          {tarifRappen == null ? t('wartung.paket.aufAnfrage') : `CHF ${formatChf(tarifRappen)}`}
        </span>
      </div>
      <Feld id="wv-preis" label={t('wartung.feld.preisNetto')} {...(fehler ? { fehler } : {})}>
        <Input
          id="wv-preis"
          inputMode="decimal"
          value={wert}
          onChange={(e) => {
            onChange(e.target.value)
          }}
        />
      </Feld>
      {rabatt > 0 && (
        <p className="flex items-center gap-2 text-xs">
          <Badge ton="warnung">{t('wartung.preis.abweichung', { prozent: rabatt })}</Badge>
        </p>
      )}
      {preisRappen != null && inkl != null && (
        <dl className="flex flex-col gap-1 border-t pt-2 text-sm">
          <div className="text-muted-foreground flex justify-between">
            <dt>{t('wartung.preis.mwst', { satz })}</dt>
            <dd className="zahlen">CHF {formatChf(inkl - preisRappen)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>{t('wartung.preis.inkl')}</dt>
            <dd className="zahlen">CHF {formatChf(inkl)}</dd>
          </div>
        </dl>
      )}
      <p className="text-muted-foreground text-xs">
        {tarifRappen == null ? t('wartung.preis.hinweisAnfrage') : t('wartung.preis.hinweisTarif')}
      </p>
    </div>
  )
}
