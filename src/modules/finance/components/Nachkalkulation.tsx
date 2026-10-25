import { Link2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAktion } from '../hooks/useAktion'
import { useNachkalkulation, useProjekte } from '../hooks/useFinanzen'
import { zahlungSpeichern } from '../services/finanzen'
import type { Finanzdaten } from '../types'

/**
 * Nachkalkulation je Projekt (Entscheid 0009): Soll aus der Kalkulation, Ist aus Lieferantenrechnungen (AbaNinja)
 * oder Bestellungen, Zeiten zum internen Stundensatz, Nachträgen und Rechnungen. Lieferantenrechnungen ohne
 * Projekt lassen sich hier zuordnen.
 */
export function Nachkalkulation({ daten }: { daten: Finanzdaten }) {
  const { t } = useTranslation()
  const projekte = useProjekte()
  const [suche, setSuche] = useState('')
  const [projektId, setProjektId] = useState<string | null>(null)
  const nk = useNachkalkulation(projektId)
  const { laeuft, aus } = useAktion()
  const s = suche.trim().toLowerCase()
  const treffer = s
    ? (projekte.data ?? [])
        .filter((p) => `${p.nummer} ${p.titel ?? ''} ${p.kunde ?? ''}`.toLowerCase().includes(s))
        .slice(0, 8)
    : []
  const projekt = (projekte.data ?? []).find((p) => p.id === projektId)
  const belege = daten.zahlungen.filter((z) => z.abaninja_uuid)
  const zugeordnet = belege.filter((z) => z.projekt_id === projektId)
  const ohneProjekt = belege.filter((z) => !z.projekt_id && z.kategorie !== 'Lohn')
  const n = nk.data
  const zeile = (label: string, wert: number | null | undefined, o: { fett?: boolean; minus?: boolean } = {}) => (
    <div className={cn('flex justify-between gap-2 py-1 text-sm', o.fett && 'border-t pt-2 font-semibold')}>
      <span className={o.fett ? '' : 'text-muted-foreground'}>{label}</span>
      <span className={cn('zahlen', o.fett && wert !== null && wert !== undefined && wert < 0 && 'text-bad')}>
        {wert === null || wert === undefined
          ? '–'
          : `${o.minus ? '−' : ''}${formatChf(wert, { mitWaehrung: Boolean(o.fett) })}`}
      </span>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-w-xl flex-col gap-2">
        <Input
          aria-label={t('finanzen.nk.suche')}
          placeholder={t('finanzen.nk.suche')}
          value={suche}
          onChange={(e) => {
            setSuche(e.target.value)
          }}
        />
        {treffer.length > 0 && (
          <ul className="bg-surface divide-y rounded-md border">
            {treffer.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="hover:bg-surface-2 w-full px-3 py-2 text-left text-sm"
                  onClick={() => {
                    setProjektId(p.id)
                    setSuche('')
                  }}
                >
                  <span className="font-medium">{p.nummer}</span>
                  <span className="text-muted-foreground ml-2">{[p.kunde, p.titel].filter(Boolean).join(' · ')}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {projektId && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <AkteAbschnitt
            ebene={2}
            titel={projekt ? `${projekt.nummer} · ${projekt.kunde ?? ''}` : t('finanzen.nk.titel')}
          >
            {nk.error ? (
              <Fehlerzustand details={String(nk.error)} onNochmal={() => void nk.refetch()} />
            ) : !n ? (
              <Skelett className="h-48" />
            ) : (
              <div className="flex flex-col">
                {zeile(t('finanzen.nk.vertrag'), n.ist.vertrag_rappen)}
                {zeile(t('finanzen.nk.nachtraege'), n.ist.nachtraege_rappen)}
                {zeile(t('finanzen.nk.umsatz'), n.ist.umsatz_rappen, { fett: true })}
                {zeile(
                  t(`finanzen.nk.material.${n.ist.material_quelle}`, { defaultValue: t('finanzen.nk.materialKurz') }),
                  n.ist.material_rappen,
                  { minus: true },
                )}
                {zeile(t('finanzen.nk.arbeit', { stunden: n.ist.stunden }), n.ist.arbeit_rappen, { minus: true })}
                {zeile(t('finanzen.nk.marge'), n.ist.marge_rappen, { fett: true })}
                <p className="text-muted-foreground mt-3 text-xs">
                  {t('finanzen.nk.soll', {
                    verkauf: n.soll.verkauf_rappen !== null ? formatChf(n.soll.verkauf_rappen) : '–',
                    einkauf: n.soll.einkauf_rappen !== null ? formatChf(n.soll.einkauf_rappen) : '–',
                    stunden: n.soll.stunden ?? '–',
                  })}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t('finanzen.nk.verrechnet', { betrag: formatChf(n.ist.verrechnet_rappen, { mitWaehrung: true }) })}
                </p>
              </div>
            )}
          </AkteAbschnitt>
          <AkteAbschnitt ebene={2} titel={t('finanzen.nk.belege')} zusatz={String(zugeordnet.length)}>
            <ul className="divide-y text-sm">
              {zugeordnet.map((z) => (
                <li key={z.id} className="flex justify-between gap-2 py-1.5">
                  <span className="min-w-0 truncate">
                    {z.firma}
                    <span className="text-muted-foreground ml-2 text-xs">
                      {[z.rechnung_nr, z.rechnung_am ? formatDatum(z.rechnung_am) : null].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="zahlen">{formatChf(z.betrag_rappen ?? 0)}</span>
                </li>
              ))}
            </ul>
            {ohneProjekt.length > 0 && (
              <>
                <p className="text-muted-foreground mt-3 mb-1 text-xs font-medium">{t('finanzen.nk.ohneProjekt')}</p>
                <ul className="divide-y text-sm">
                  {ohneProjekt.map((z) => (
                    <li key={z.id} className="flex items-center justify-between gap-2 py-1.5">
                      <span className="min-w-0 truncate">
                        {z.firma}
                        <span className="text-muted-foreground ml-2 text-xs">{z.rechnung_nr}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="zahlen">{formatChf(z.betrag_rappen ?? 0)}</span>
                        <Button
                          size="sm"
                          variant="secondary"
                          laedt={laeuft}
                          onClick={() =>
                            void aus(() => zahlungSpeichern(z.id, { projekt_id: projektId }), {
                              de: 'Dem Projekt zugeordnet',
                              fr: 'Attribué au projet',
                            })
                          }
                        >
                          <Link2 />
                          {t('finanzen.nk.zuordnen')}
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </AkteAbschnitt>
        </div>
      )}
    </div>
  )
}
