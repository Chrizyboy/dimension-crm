import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { formatChf, formatDatum, parseChf } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAktion } from '../hooks/useAktion'
import { heuteZuerich } from '../lib/datum'
import { prioRang, saldo, zahllaufVorschlag } from '../lib/vorschau'
import { zahlungenPlanen } from '../services/finanzen'
import type { Finanzdaten } from '../types'

/**
 * Zahllauf planen (V233): verfügbaren Betrag eingeben, vorgeschlagen werden zuerst Betreibungen und Mahnungen,
 * dann nach Fälligkeit. Häkchen anpassen und für das Datum einplanen. Bezahlt wird in der Bank, nicht hier.
 */
export function ZahllaufDialog({ daten, onSchliessen }: { daten: Finanzdaten; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const s = saldo(daten)
  const offene = daten.zahlungen
    .filter((z) => z.status !== 'bezahlt' && (z.offen_rappen ?? z.betrag_rappen))
    .map((z) => ({ ...z, rappen: z.offen_rappen ?? z.betrag_rappen ?? 0 }))
    .sort(
      (a, b) =>
        prioRang(a.prioritaet) - prioRang(b.prioritaet) || (a.faellig_am ?? '9').localeCompare(b.faellig_am ?? '9'),
    )
  const start = Math.max(0, s.bekannt ? s.rappen - (daten.einstellungen.reserve_rappen ?? 0) : 0)
  const [datum, setDatum] = useState(heuteZuerich())
  const [verfuegbar, setVerfuegbar] = useState(start ? formatChf(start) : '')
  const [gewaehlt, setGewaehlt] = useState(() => new Set(zahllaufVorschlag(offene, start)))
  const summe = offene.filter((z) => gewaehlt.has(z.id)).reduce((x, z) => x + z.rappen, 0)
  const av = parseChf(verfuegbar) ?? 0

  async function einplanen() {
    const ok = await aus(() => zahlungenPlanen([...gewaehlt], datum), {
      de: 'Zahllauf eingeplant',
      fr: 'Paiements planifiés',
    })
    if (ok) onSchliessen()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('finanzen.zahllauf.titel')}
        beschreibung={t('finanzen.zahllauf.text')}
        className="md:w-[40rem]"
        fuss={
          <>
            <Button
              variant="ghost"
              className="mr-auto"
              onClick={() => {
                setGewaehlt(new Set(zahllaufVorschlag(offene, av)))
              }}
            >
              {t('finanzen.zahllauf.vorschlag')}
            </Button>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={laeuft} disabled={gewaehlt.size === 0 || !datum} onClick={() => void einplanen()}>
              {t('finanzen.zahllauf.einplanen', { count: gewaehlt.size })}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Feld id="zl-datum" label={t('finanzen.zahllauf.datum')} pflicht>
            <Input
              id="zl-datum"
              type="date"
              value={datum}
              onChange={(e) => {
                setDatum(e.target.value)
              }}
            />
          </Feld>
          <Feld id="zl-verfuegbar" label={t('finanzen.zahllauf.verfuegbar')}>
            <Input
              id="zl-verfuegbar"
              inputMode="decimal"
              value={verfuegbar}
              onChange={(e) => {
                setVerfuegbar(e.target.value)
              }}
            />
          </Feld>
        </div>
        <p className="mt-3 text-sm">
          {t('finanzen.zahllauf.summe', {
            summe: formatChf(summe, { mitWaehrung: true }),
            verfuegbar: formatChf(av, { mitWaehrung: true }),
          })}{' '}
          <span className={cn('font-medium', summe > av ? 'text-bad' : 'text-ok')}>
            {summe > av
              ? t('finanzen.zahllauf.zuviel', { betrag: formatChf(summe - av) })
              : t('finanzen.zahllauf.rest', { betrag: formatChf(av - summe) })}
          </span>
        </p>
        <ul className="mt-2 max-h-80 divide-y overflow-y-auto rounded-md border">
          {offene.map((z) => (
            <li key={z.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                <Checkbox
                  checked={gewaehlt.has(z.id)}
                  onCheckedChange={(c) => {
                    const neu = new Set(gewaehlt)
                    if (c === true) neu.add(z.id)
                    else neu.delete(z.id)
                    setGewaehlt(neu)
                  }}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{z.firma}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {[z.text, z.faellig_am ? t('finanzen.faelligKurz', { datum: formatDatum(z.faellig_am) }) : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                {z.prioritaet && z.prioritaet !== 'normal' && (
                  <Badge
                    ton={z.prioritaet === 'betreibung' ? 'kritisch' : z.prioritaet === 'mahnung' ? 'warnung' : 'info'}
                  >
                    {t(`finanzen.prio.${z.prioritaet}`)}
                  </Badge>
                )}
                <span className="zahlen w-24 text-right">{z.kategorie === 'Lohn' ? '••••' : formatChf(z.rappen)}</span>
              </label>
            </li>
          ))}
        </ul>
      </DialogInhalt>
    </Dialog>
  )
}
