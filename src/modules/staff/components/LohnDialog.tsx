import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatChf, parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { lohnSchema } from '../schema'
import { eintragEntfernen, lohnSpeichern } from '../services/akte'
import type { Lohn } from '../types'

/**
 * Lohn zur Info für GL und Buchhaltung (Recht «personal»). Abgerechnet wird weiter in AbaNinja; eine Änderung
 * erfasst man als neuen Eintrag mit «gültig ab», so bleibt der Verlauf sichtbar.
 */
export function LohnDialog({
  personId,
  lohn,
  onSchliessen,
}: {
  personId: string
  lohn: Lohn | null
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [ab, setAb] = useState(lohn?.gueltig_ab ?? '')
  const [art, setArt] = useState<Lohn['lohnart']>(lohn?.lohnart ?? 'monat')
  const [betrag, setBetrag] = useState(lohn ? formatChf(lohn.betrag_rappen) : '')
  const [anzahl, setAnzahl] = useState(String(lohn?.anzahl_loehne ?? 13))
  const [notiz, setNotiz] = useState(lohn?.notiz ?? '')
  const rappen = parseChf(betrag)
  const gueltig = lohnSchema.safeParse({ gueltig_ab: ab, lohnart: art, betrag_rappen: rappen }).success

  async function speichern() {
    if (rappen === null) return
    const ok = await aus(
      () =>
        lohnSpeichern(
          {
            person_id: personId,
            gueltig_ab: ab,
            lohnart: art,
            betrag_rappen: rappen,
            anzahl_loehne: art === 'monat' ? (Number(anzahl) as 12 | 13) : null,
            notiz: notiz.trim() || null,
          },
          lohn?.id,
        ),
      { de: 'Gespeichert', fr: 'Enregistré' },
    )
    if (ok) onSchliessen()
  }

  async function entfernen() {
    if (!lohn) return
    const ok = await aus(() => eintragEntfernen('personal_loehne', lohn.id), {
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
        titel={t(lohn ? 'team.lohn.bearbeiten' : 'team.lohn.neu')}
        beschreibung={t('team.lohn.text')}
        fuss={
          <>
            {lohn && (
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
          <Feld id="lo-art" label={t('team.lohn.lohnart')} pflicht>
            <Auswahl
              id="lo-art"
              value={art}
              onValueChange={(v) => {
                setArt(v as Lohn['lohnart'])
              }}
              optionen={[
                { wert: 'monat', text: t('team.lohn.monat') },
                { wert: 'stunde', text: t('team.lohn.stunde') },
              ]}
            />
          </Feld>
          <Feld id="lo-ab" label={t('team.lohn.gueltigAb')} pflicht>
            <Input
              id="lo-ab"
              type="date"
              value={ab}
              onChange={(e) => {
                setAb(e.target.value)
              }}
            />
          </Feld>
          <Feld
            id="lo-betrag"
            label={t(art === 'monat' ? 'team.lohn.betragMonat' : 'team.lohn.betragStunde')}
            pflicht
            {...(betrag && rappen === null ? { fehler: t('team.lohn.betragFehler') } : {})}
          >
            <Input
              id="lo-betrag"
              inputMode="decimal"
              placeholder={art === 'monat' ? "6'200.00" : '38.50'}
              value={betrag}
              onChange={(e) => {
                setBetrag(e.target.value)
              }}
            />
          </Feld>
          {art === 'monat' && (
            <Feld id="lo-anzahl" label={t('team.lohn.anzahl')}>
              <Auswahl
                id="lo-anzahl"
                value={anzahl}
                onValueChange={setAnzahl}
                optionen={[
                  { wert: '13', text: t('team.lohn.mal', { anzahl: 13 }) },
                  { wert: '12', text: t('team.lohn.mal', { anzahl: 12 }) },
                ]}
              />
            </Feld>
          )}
          <Feld id="lo-notiz" label={t('team.lohn.notiz')} className="sm:col-span-2">
            <Input
              id="lo-notiz"
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
