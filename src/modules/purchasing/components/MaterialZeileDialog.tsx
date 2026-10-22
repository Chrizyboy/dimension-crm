import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAktion } from '../hooks/useAktion'
import { alsZahl, formatMenge } from '../lib/anzeige'
import { zeileSpeichern } from '../services/material'
import type { MaterialZeile } from '../types'
import { ArtikelWahl } from './ArtikelWahl'

/** Zeile der Materialliste anlegen oder ändern: Artikel aus der Preisliste (oder freier Text), Menge, Einheit. */
export function MaterialZeileDialog({
  projektId,
  zeile,
  onSchliessen,
}: {
  projektId: string
  zeile: MaterialZeile | null
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [artikelId, setArtikelId] = useState(zeile?.artikel_id ?? null)
  const [bezeichnung, setBezeichnung] = useState(zeile?.bezeichnung ?? '')
  const [menge, setMenge] = useState(zeile ? formatMenge(zeile.menge) : '1')
  const [einheit, setEinheit] = useState(zeile?.einheit ?? 'Stk')
  const [notiz, setNotiz] = useState(zeile?.notiz ?? '')
  const n = alsZahl(menge)
  const gueltig = bezeichnung.trim() !== '' && n !== null && n >= 0

  async function speichern() {
    const ok = await aus(() =>
      zeileSpeichern({
        ...(zeile ? { id: zeile.id } : {}),
        projekt_id: projektId,
        artikel_id: artikelId,
        bezeichnung: bezeichnung.trim(),
        menge: n ?? 0,
        einheit: einheit.trim() || 'Stk',
        notiz: notiz.trim() || null,
      }),
    )
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
        titel={zeile ? t('einkauf.zeile.bearbeiten') : t('einkauf.zeile.neu')}
        beschreibung={t('einkauf.zeile.text')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft} disabled={!gueltig}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Feld id="mz-artikel" label={t('einkauf.zeile.artikel')}>
            <ArtikelWahl
              id="mz-artikel"
              onWahl={(a) => {
                setArtikelId(a.id)
                setBezeichnung(a.name)
                setEinheit(a.einheit)
              }}
              onFrei={(text) => {
                setArtikelId(null)
                setBezeichnung(text)
              }}
            />
          </Feld>
          <Feld
            id="mz-bezeichnung"
            label={t('einkauf.zeile.bezeichnung')}
            pflicht
            {...(artikelId ? {} : { hinweis: t('einkauf.zeile.ohneArtikel') })}
          >
            <Input
              id="mz-bezeichnung"
              value={bezeichnung}
              onChange={(e) => {
                setBezeichnung(e.target.value)
              }}
            />
          </Feld>
          <div className="grid grid-cols-2 gap-3">
            <Feld id="mz-menge" label={t('einkauf.zeile.menge')} pflicht>
              <Input
                id="mz-menge"
                inputMode="decimal"
                value={menge}
                onChange={(e) => {
                  setMenge(e.target.value)
                }}
              />
            </Feld>
            <Feld id="mz-einheit" label={t('einkauf.zeile.einheit')}>
              <Input
                id="mz-einheit"
                value={einheit}
                onChange={(e) => {
                  setEinheit(e.target.value)
                }}
              />
            </Feld>
          </div>
          <Feld id="mz-notiz" label={t('einkauf.feld.notiz')}>
            <Input
              id="mz-notiz"
              value={notiz}
              onChange={(e) => {
                setNotiz(e.target.value)
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
