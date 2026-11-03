import { useQuery } from '@tanstack/react-query'
import { Calculator } from 'lucide-react'
import { useDeferredValue, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { mitMwst, useMwst } from '@/hooks/useMwst'
import { formatChf } from '@/lib/format'
import { PREIS_SCHLUESSEL, usePreisRegeln } from '../hooks/usePreise'
import { foerderung } from '../lib/kalkulation'
import { ladeRichtpreis } from '../services/regeln'

/**
 * Richtpreis fürs erste Gespräch (für alle Rollen): kWp und Speicher eingeben, dann die Spanne aus unseren
 * Offerten ähnlicher Grösse der letzten zwei Jahre inkl. MWST und nach geschätzter Förderung. Kein Einkauf sichtbar.
 */
export function RichtpreisRechner() {
  const { t } = useTranslation()
  const id = useId()
  const satz = useMwst()
  const regeln = usePreisRegeln()
  const [text, setText] = useState('10')
  const [speicher, setSpeicher] = useState(false)
  const kwp = Number(useDeferredValue(text).replace(',', '.'))
  const gueltig = Number.isFinite(kwp) && kwp > 0 && kwp < 5000
  const r = useQuery({
    queryKey: [...PREIS_SCHLUESSEL, 'richtpreis', kwp, speicher],
    queryFn: () => ladeRichtpreis(kwp, speicher),
    enabled: gueltig,
    staleTime: 10 * 60_000,
  })
  const f = gueltig ? foerderung(kwp, regeln.data?.foerderung) : 0
  const spanne = (v: number | null, b: number | null, minus = 0) =>
    v === null || b === null
      ? '–'
      : `CHF ${formatChf(mitMwst(v, satz) - minus)} – ${formatChf(mitMwst(b, satz) - minus)}`

  return (
    <section aria-labelledby={`${id}-titel`} className="bg-surface flex flex-col gap-3 rounded-lg border p-4">
      <h2 id={`${id}-titel`} className="flex items-center gap-2 text-sm font-semibold">
        <Calculator className="text-muted-foreground size-4" aria-hidden="true" />
        {t('preise.richtpreis.titel')}
      </h2>
      <div className="flex flex-wrap items-end gap-4">
        <Feld id={`${id}-kwp`} label={t('preise.richtpreis.kwp')} className="w-28">
          <Input
            id={`${id}-kwp`}
            inputMode="decimal"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
            }}
          />
        </Feld>
        <label className="flex h-8 items-center gap-2 text-sm">
          <Switch checked={speicher} onCheckedChange={setSpeicher} />
          {t('preise.richtpreis.speicher')}
        </label>
        <div role="status" className="flex min-w-60 flex-1 flex-col text-sm">
          {!gueltig || r.isPending ? (
            <span className="text-muted-foreground">{t('preise.richtpreis.eingeben')}</span>
          ) : r.data && r.data.anzahl > 0 ? (
            <>
              <span className="zahlen font-display text-lg font-semibold">
                {spanne(r.data.vonRappen, r.data.bisRappen)}
              </span>
              {f > 0 && (
                <span className="text-ok">
                  {t('preise.richtpreis.nachFoerderung', { betrag: spanne(r.data.vonRappen, r.data.bisRappen, f) })}
                </span>
              )}
              <span className="text-muted-foreground text-xs">
                {t(`preise.richtpreis.basis.${r.data.basis}`, { n: r.data.anzahl, satz })}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">{t('preise.richtpreis.keine')}</span>
          )}
        </div>
      </div>
    </section>
  )
}
