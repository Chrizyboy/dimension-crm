import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { nachweisSpeichern } from '../services/submission'
import type { NachweisArt } from '../types'

/**
 * Neuen Nachweis ablegen (Betreibungsauszug, SUVA, AHV, Steuern, Versicherung …). Die Gültigkeit rechnet die
 * Datenbank aus der Art (Monate aus den Regeln), ausser sie wird hier eingetragen. Die Aufgabe «Nachweis erneuern»
 * schliesst sich damit selbst.
 */
export function NachweisDialog({
  firmen,
  arten,
  vorgabe,
  onSchliessen,
}: {
  firmen: { id: string; name: string }[]
  arten: NachweisArt[]
  vorgabe?: { firma_id: string; art: string }
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const { laeuft, aus } = useAktion()
  const [w, setW] = useState({
    firma_id: vorgabe?.firma_id ?? firmen[0]?.id ?? '',
    art: vorgabe?.art ?? '',
    ausgestellt_am: new Date().toISOString().slice(0, 10),
    gueltig_bis: '',
    notiz: '',
  })
  const [datei, setDatei] = useState<File | null>(null)
  const [fehler, setFehler] = useState(false)

  async function speichern() {
    if (!w.firma_id || !w.art || !w.ausgestellt_am) {
      setFehler(true)
      return
    }
    const ok = await aus(
      () =>
        nachweisSpeichern({
          firma_id: w.firma_id,
          art: w.art,
          ausgestellt_am: w.ausgestellt_am,
          ...(w.gueltig_bis ? { gueltig_bis: w.gueltig_bis } : {}),
          ...(w.notiz.trim() ? { notiz: w.notiz.trim() } : {}),
          datei,
        }),
      { de: 'Nachweis abgelegt', fr: 'Attestation enregistrée' },
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
        titel={t('ausschreibungen.nachweise.neu')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={laeuft} onClick={() => void speichern()}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Feld id="nw-firma" label={t('ausschreibungen.nachweise.firma')} pflicht>
            <Auswahl
              id="nw-firma"
              value={w.firma_id}
              onValueChange={(v) => {
                setW({ ...w, firma_id: v })
              }}
              optionen={firmen.map((f) => ({ wert: f.id, text: f.name }))}
            />
          </Feld>
          <Feld
            id="nw-art"
            label={t('ausschreibungen.nachweise.art')}
            pflicht
            {...(fehler && !w.art ? { fehler: t('pruefung.pflicht') } : {})}
          >
            <Auswahl
              id="nw-art"
              value={w.art}
              platzhalter="–"
              onValueChange={(v) => {
                setW({ ...w, art: v })
              }}
              optionen={arten.map((a) => ({
                wert: a.art,
                text: `${sprache === 'fr' ? a.fr : a.de} (${t('ausschreibungen.monate', { count: a.monate })})`,
              }))}
            />
          </Feld>
          <div className="grid gap-3 sm:grid-cols-2">
            <Feld id="nw-am" label={t('ausschreibungen.nachweise.ausgestellt')} pflicht>
              <Input
                id="nw-am"
                type="date"
                value={w.ausgestellt_am}
                onChange={(e) => {
                  setW({ ...w, ausgestellt_am: e.target.value })
                }}
              />
            </Feld>
            <Feld
              id="nw-bis"
              label={t('ausschreibungen.nachweise.gueltigBis')}
              hinweis={t('ausschreibungen.nachweise.gueltigHinweis')}
            >
              <Input
                id="nw-bis"
                type="date"
                value={w.gueltig_bis}
                onChange={(e) => {
                  setW({ ...w, gueltig_bis: e.target.value })
                }}
              />
            </Feld>
          </div>
          <Feld id="nw-datei" label={t('ausschreibungen.nachweise.datei')}>
            <Input
              id="nw-datei"
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => {
                setDatei(e.target.files?.[0] ?? null)
              }}
            />
          </Feld>
          <Feld id="nw-notiz" label={t('ausschreibungen.nachweise.notiz')}>
            <Input
              id="nw-notiz"
              value={w.notiz}
              onChange={(e) => {
                setW({ ...w, notiz: e.target.value })
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
