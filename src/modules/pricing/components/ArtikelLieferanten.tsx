import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatChf, formatDatum, parseChf } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useLieferanten, useLieferantenpreise, usePreisAenderung } from '../hooks/usePreise'
import { entferneLieferantenpreis, speichereLieferantenpreis } from '../services/preise'
import type { Artikel } from '../types'
import { PreisFeld } from './PreisFeld'

function heute(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Preise je Lieferant (V121: Krannich, Solarmarkt, Tritec, PM Green+ …): Lieferant, Art.-Nr., EK, Stand.
 * Der günstigste Preis ist der EK in der Preisliste.
 */
export function ArtikelLieferanten({ a }: { a: Artikel }) {
  const { t } = useTranslation()
  const preise = useLieferantenpreise(a.id, true)
  const lieferanten = useLieferanten()
  const [neu, setNeu] = useState({ lieferant: '', nr: '', ek: '' })
  const [sicher, setSicher] = useState<string | null>(null)
  const speichern = usePreisAenderung((p: Parameters<typeof speichereLieferantenpreis>[1]) =>
    speichereLieferantenpreis(a.id, p),
  )
  const entfernen = usePreisAenderung(entferneLieferantenpreis)

  async function aus(aktion: () => Promise<unknown>) {
    try {
      await aktion()
    } catch (f) {
      meldeFehler(f, 'preise.lieferant')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  const zeilen = preise.data ?? []
  const guenstigster = zeilen.find((z) => z.ekRappen !== null)?.id
  return (
    <AkteAbschnitt titel={t('preise.akte.lieferanten')} zusatz={zeilen.length || undefined}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground text-left text-xs">
            <th className="py-1 font-medium">{t('preise.spalte.lieferant')}</th>
            <th className="py-1 font-medium">{t('preise.akte.artNr')}</th>
            <th className="py-1 text-right font-medium">{t('preise.spalte.ek')}</th>
            <th className="py-1 font-medium">{t('preise.akte.standSpalte')}</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {zeilen.map((z) => (
            <tr key={z.id} className="border-t">
              <td className="py-1 pr-2">
                {z.lieferant ?? '–'}
                {z.id === guenstigster && zeilen.length > 1 && (
                  <span className="text-ok block text-xs">{t('preise.akte.guenstigster')}</span>
                )}
              </td>
              <td className="py-1 pr-2 font-mono text-xs">{z.artikelnummer ?? '–'}</td>
              <td className="py-1 text-right">
                <PreisFeld
                  label={`${t('preise.spalte.ek')} ${z.lieferant ?? ''}`}
                  wert={z.ekRappen === null ? '' : formatChf(z.ekRappen)}
                  onSpeichern={(x) =>
                    void aus(() =>
                      speichern.mutateAsync({
                        id: z.id,
                        lieferant_id: z.lieferantId,
                        artikelnummer: z.artikelnummer,
                        ek_rappen: parseChf(x),
                        stand: heute(),
                      }),
                    )
                  }
                />
              </td>
              <td className="zahlen py-1 font-mono text-xs">{z.stand ? formatDatum(z.stand) : '–'}</td>
              <td className="py-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t(sicher === z.id ? 'preise.akte.entfernenFrage' : 'preise.akte.entfernen')}
                  title={t(sicher === z.id ? 'preise.akte.entfernenFrage' : 'preise.akte.entfernen')}
                  className={sicher === z.id ? 'text-bad' : undefined}
                  onClick={() => {
                    if (sicher !== z.id) setSicher(z.id)
                    else {
                      setSicher(null)
                      void aus(() => entfernen.mutateAsync(z.id))
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form
        className="flex flex-wrap items-end gap-2 pt-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!neu.ek.trim()) return
          void aus(async () => {
            await speichern.mutateAsync({
              lieferant_id: neu.lieferant || null,
              artikelnummer: neu.nr.trim() || null,
              ek_rappen: parseChf(neu.ek),
              stand: heute(),
            })
            setNeu({ lieferant: '', nr: '', ek: '' })
          })
        }}
      >
        <Auswahl
          aria-label={t('preise.spalte.lieferant')}
          className="w-40"
          platzhalter={t('preise.spalte.lieferant')}
          value={neu.lieferant}
          onValueChange={(v) => {
            setNeu((x) => ({ ...x, lieferant: v }))
          }}
          optionen={(lieferanten.data ?? []).map((l) => ({ wert: l.id, text: l.name }))}
        />
        <Input
          aria-label={t('preise.akte.artNr')}
          placeholder={t('preise.akte.artNr')}
          className="w-28"
          value={neu.nr}
          onChange={(e) => {
            setNeu((x) => ({ ...x, nr: e.target.value }))
          }}
        />
        <Input
          aria-label={t('preise.spalte.ek')}
          placeholder="EK"
          inputMode="decimal"
          className="w-24"
          value={neu.ek}
          onChange={(e) => {
            setNeu((x) => ({ ...x, ek: e.target.value }))
          }}
        />
        <Button type="submit" size="sm" variant="secondary" laedt={speichern.isPending}>
          <Plus />
          {t('preise.akte.preisDazu')}
        </Button>
      </form>
    </AkteAbschnitt>
  )
}
