import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { usePreisAenderung } from '../hooks/usePreise'
import { setzeArtikel } from '../services/preise'
import type { Artikel } from '../types'

/** Abmessungen und Gewicht (V97), z. B. «1722 × 1134 × 30 mm» und «21.5 kg», für Planung und Transport. */
export function ArtikelMasse({ a }: { a: Artikel }) {
  const { t } = useTranslation()
  const [masse, setMasse] = useState(a.masse ?? '')
  const [gewicht, setGewicht] = useState(a.gewichtKg === null ? '' : String(a.gewichtKg))
  const speichern = usePreisAenderung(() =>
    setzeArtikel(a.id, {
      masse: masse.trim() || null,
      gewicht_kg: gewicht.trim() ? Number(gewicht.replace(',', '.')) : null,
    }),
  )
  const geaendert = masse !== (a.masse ?? '') || gewicht !== (a.gewichtKg === null ? '' : String(a.gewichtKg))

  async function absenden() {
    try {
      await speichern.mutateAsync(undefined)
      melde('ok', { de: 'Masse gespeichert', fr: 'Dimensions enregistrées' })
    } catch (f) {
      meldeFehler(f, 'preise.masse')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  return (
    <AkteAbschnitt titel={t('preise.akte.masse')} offen={Boolean(a.masse ?? a.gewichtKg)}>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void absenden()
        }}
      >
        <Feld id="artikel-masse" label={t('preise.akte.abmessungen')} className="min-w-48 flex-1">
          <Input
            id="artikel-masse"
            value={masse}
            placeholder="1722 × 1134 × 30 mm"
            onChange={(e) => {
              setMasse(e.target.value)
            }}
          />
        </Feld>
        <Feld id="artikel-gewicht" label={t('preise.akte.gewicht')} className="w-28">
          <Input
            id="artikel-gewicht"
            inputMode="decimal"
            value={gewicht}
            onChange={(e) => {
              setGewicht(e.target.value)
            }}
          />
        </Feld>
        <Button type="submit" size="sm" disabled={!geaendert} laedt={speichern.isPending}>
          {t('allgemein.speichern')}
        </Button>
      </form>
      {a.masseArt && <p className="text-muted-foreground pt-2 text-xs">{a.masseArt}</p>}
    </AkteAbschnitt>
  )
}
