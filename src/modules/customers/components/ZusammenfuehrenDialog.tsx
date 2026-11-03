import { useQuery } from '@tanstack/react-query'
import { Merge } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { formatKundennummer } from '@/lib/kontakt'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import type { Kontaktzeile } from '@/types/kontakt'
import { useKontaktAenderung } from '../hooks/useKunden'
import { fuehreZusammen, ladeDoppelte } from '../services/betreuung'

/**
 * Doppelten in diesen Kunden überführen (nur Administration, Entscheid 0045). Zur Wahl stehen die möglichen
 * Doppelten aus der Datenbank (gleiche Mail, Telefon oder Name). Der Doppelte landet im Papierkorb.
 */
export function ZusammenfuehrenDialog({ kopf, onSchliessen }: { kopf: Kontaktzeile; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)
  const doppelte = useQuery({
    queryKey: ['kontakte', 'doppelte', kopf.id],
    queryFn: () => ladeDoppelte(kopf.id, { name: kopf.name, email: kopf.email, telefon: kopf.telefon }),
  })
  const zusammen = useKontaktAenderung((weg: string) => fuehreZusammen(kopf.id, weg))

  async function ausfuehren() {
    if (!gewaehlt) return
    try {
      const n = await zusammen.mutateAsync(gewaehlt)
      melde('ok', { de: `Zusammengeführt, ${n} Einträge umgehängt`, fr: `Fusionné, ${n} éléments déplacés` })
      onSchliessen()
    } catch (f) {
      meldeFehler(f, 'zusammenfuehren')
      melde('kritisch', { de: 'Nicht zusammengeführt', fr: 'Fusion impossible' })
    }
  }

  const liste = doppelte.data ?? []
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('kundenseite.zusammen.titel')}
        beschreibung={t('kundenseite.zusammen.text', { name: kopf.name })}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button variant="danger" disabled={!gewaehlt} laedt={zusammen.isPending} onClick={() => void ausfuehren()}>
              <Merge />
              {t('kundenseite.zusammen.bestaetigen')}
            </Button>
          </>
        }
      >
        {!doppelte.isPending && liste.length === 0 && (
          <p className="text-muted-foreground text-sm">{t('kundenseite.zusammen.keine')}</p>
        )}
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">{t('kundenseite.zusammen.titel')}</legend>
          {liste.map((d) => (
            <label
              key={d.id}
              className="has-[:checked]:border-accent has-[:checked]:bg-accent-soft flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm"
            >
              <input
                type="radio"
                name="doppelter"
                className="mt-1"
                checked={gewaehlt === d.id}
                onChange={() => {
                  setGewaehlt(d.id)
                }}
              />
              <span className="flex flex-col">
                <span className="font-medium">
                  {d.name} <span className="text-muted-foreground zahlen">{formatKundennummer(d.kundennummer)}</span>
                </span>
                <span className="text-muted-foreground text-xs">
                  {[d.ort, t(`kundenseite.zusammen.grund.${d.grund}`)].filter(Boolean).join(' · ')}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      </DialogInhalt>
    </Dialog>
  )
}
