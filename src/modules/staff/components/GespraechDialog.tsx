import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useAktion } from '../hooks/useAktion'
import { heuteZuerich } from '../lib/matrix'
import { gespraechSchema } from '../schema'
import { eintragEntfernen, gespraechSpeichern } from '../services/akte'
import type { Gespraech } from '../types'

/** Ein Jahr nach dem Gespräch: Vorschlag für das nächste. */
function inEinemJahr(datum: string): string {
  const [j, rest] = [Number(datum.slice(0, 4)), datum.slice(4)]
  return `${String(j + 1)}${rest}`
}

/**
 * Mitarbeitergespräch erfassen (Recht «personal» oder Vorgesetzte/r): Datum, Art, kurze Notiz und das nächste
 * Gespräch. Das nächste Gespräch kommt als Frist mit Aufgabe und Glocke (Zeitplan, `personal_fristen_melden`).
 */
export function GespraechDialog({
  personId,
  gespraech,
  naechstes,
  onSchliessen,
}: {
  personId: string
  gespraech: Gespraech | null
  naechstes: string | null
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const arten = useAuswahl('personal_gespraech')
  const [datum, setDatum] = useState(gespraech?.datum ?? heuteZuerich())
  const [art, setArt] = useState(gespraech?.art ?? 'jahr')
  const [notiz, setNotiz] = useState(gespraech?.notiz ?? '')
  const [weiter, setWeiter] = useState(naechstes ?? (gespraech ? '' : inEinemJahr(heuteZuerich())))
  const gueltig = gespraechSchema.safeParse({ datum, art, naechstes: weiter || null }).success

  async function speichern() {
    const ok = await aus(
      () =>
        gespraechSpeichern({
          person_id: personId,
          datum,
          art,
          notiz: notiz.trim() || null,
          naechstes: weiter || null,
          ...(gespraech ? { id: gespraech.id } : {}),
        }),
      { de: 'Gespeichert', fr: 'Enregistré' },
    )
    if (ok) onSchliessen()
  }

  async function entfernen() {
    if (!gespraech) return
    const ok = await aus(() => eintragEntfernen('personal_gespraeche', gespraech.id), {
      de: 'In den Papierkorb gelegt',
      fr: 'Mis à la corbeille',
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
        titel={t(gespraech ? 'team.gespraech.bearbeiten' : 'team.gespraech.neu')}
        beschreibung={t('team.gespraech.text')}
        fuss={
          <>
            {gespraech && (
              <Button variant="ghost" className="mr-auto" onClick={() => void entfernen()} disabled={laeuft}>
                <Trash2 />
                {t('team.ausweis.entfernen')}
              </Button>
            )}
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft} disabled={!gueltig}>
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld id="ge-datum" label={t('team.gespraech.datum')} pflicht>
            <Input
              id="ge-datum"
              type="date"
              value={datum}
              onChange={(e) => {
                setDatum(e.target.value)
              }}
            />
          </Feld>
          <Feld id="ge-art" label={t('team.gespraech.art')} pflicht>
            <Auswahl
              id="ge-art"
              value={art}
              onValueChange={setArt}
              optionen={arten.werte.map((w) => ({ wert: w.schluessel, text: arten.text(w.schluessel) }))}
            />
          </Feld>
          <Feld id="ge-notiz" label={t('team.gespraech.notiz')} className="sm:col-span-2">
            <Textarea
              id="ge-notiz"
              rows={4}
              value={notiz}
              onChange={(e) => {
                setNotiz(e.target.value)
              }}
            />
          </Feld>
          <Feld
            id="ge-weiter"
            label={t('team.gespraech.naechstes')}
            hinweis={t('team.gespraech.naechstesHinweis')}
            {...(weiter && weiter <= datum ? { fehler: t('fachfehler.team_gespraech_naechstes') } : {})}
          >
            <Input
              id="ge-weiter"
              type="date"
              value={weiter}
              onChange={(e) => {
                setWeiter(e.target.value)
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
