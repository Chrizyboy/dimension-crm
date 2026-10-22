import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { melde } from '@/services/meldungen'
import { useAktion } from '../hooks/useAktion'
import { useNeuLaden, useStandorte } from '../hooks/useProjekte'
import { alsIso, endeNachWerktagen, naechsterWerktag } from '../lib/zeitplan'
import { bauPlanen, bauRueckgaengig } from '../services/projekte'
import type { Projekt } from '../types'

/**
 * «Auftrag angenommen → Bautermin» (V126): Standort und Termin wählen. Ohne Termin landet die Baustelle als
 * «ausstehend» im Board, mit Termin in der Zukunft im Zeitplan, mit Termin in der Vergangenheit gilt sie als
 * gebaut (alle Schritte bis zur Montage erledigt, Anlage angelegt). Danach immer «Rückgängig» (V134).
 */
export function BauDialog({
  projekt,
  onSchliessen,
  onGeplant,
}: {
  projekt: Projekt
  onSchliessen: () => void
  onGeplant: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const neuLaden = useNeuLaden()
  const standorte = useStandorte()
  const [start] = useState(() => alsIso(naechsterWerktag(new Date())))
  const [w, setW] = useState({
    standort: projekt.standort_id ?? '',
    von: '',
    bis: '',
  })
  const tage = projekt.werktage ?? 3

  async function speichern(mitTermin: boolean) {
    let ergebnis = ''
    const ok = await aus(async () => {
      ergebnis = await bauPlanen(projekt.id, {
        ...(w.standort ? { standort_id: w.standort } : {}),
        ...(mitTermin && w.von ? { von: w.von, bis: w.bis || endeNachWerktagen(w.von, tage) } : {}),
      })
    })
    if (!ok) return
    melde(
      'ok',
      {
        de: `${projekt.kunde}: ${t(`projekte.bau.ergebnis.${ergebnis}`, { lng: 'de' })}`,
        fr: `${projekt.kunde}: ${t(`projekte.bau.ergebnis.${ergebnis}`, { lng: 'fr' })}`,
      },
      {
        aktion: {
          text: { de: 'Rückgängig', fr: 'Annuler' },
          ausfuehren: () => {
            void bauRueckgaengig(projekt.id).then(neuLaden)
          },
        },
      },
    )
    onGeplant()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('projekte.bau.titel')}
        beschreibung={`${projekt.nummer} · ${projekt.kunde}`}
        fuss={
          <>
            <Button variant="ghost" onClick={() => void speichern(false)} disabled={laeuft}>
              {t('projekte.bau.ohneTermin')}
            </Button>
            <Button onClick={() => void speichern(true)} laedt={laeuft} disabled={!w.von}>
              {t('projekte.bau.planen')}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Feld id="bau-standort" label={t('projekte.feld.standort')}>
              <Auswahl
                id="bau-standort"
                value={w.standort}
                onValueChange={(v) => {
                  setW({ ...w, standort: v })
                }}
                optionen={(standorte.data ?? []).map((s) => ({ wert: s.id, text: s.name }))}
              />
            </Feld>
          </div>
          <Feld
            id="bau-von"
            label={t('projekte.feld.von')}
            hinweis={t('projekte.bau.vonHinweis', { datum: formatDatum(start) })}
          >
            <Input
              id="bau-von"
              type="date"
              value={w.von}
              onChange={(e) => {
                const von = e.target.value
                setW({ ...w, von, bis: von ? endeNachWerktagen(von, tage) : '' })
              }}
            />
          </Feld>
          <Feld id="bau-bis" label={t('projekte.feld.bis')} hinweis={t('projekte.bau.werktage', { count: tage })}>
            <Input
              id="bau-bis"
              type="date"
              min={w.von}
              value={w.bis}
              onChange={(e) => {
                setW({ ...w, bis: e.target.value })
              }}
            />
          </Feld>
        </div>
        <p className="text-muted-foreground mt-3 text-sm">{t('projekte.bau.hilfe')}</p>
      </DialogInhalt>
    </Dialog>
  )
}
