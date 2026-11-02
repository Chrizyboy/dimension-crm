import { FileUp, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useAktion } from '../hooks/useAktion'
import { dokumentHochladen } from '../services/akte'

/**
 * Dokument in die Personal-Akte legen (Vertrag, Bewilligung, Zeugnis …), privat im Speicher «personal».
 * Die Person selbst kann nur nicht vertrauliche Arten ablegen (Vertrag und Lohn legt das Recht «personal» ab).
 */
export function DokumentDialog({
  personId,
  vertraulichErlaubt,
  onSchliessen,
}: {
  personId: string
  vertraulichErlaubt: boolean
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const arten = useAuswahl('personal_dokument')
  const eingabe = useRef<HTMLInputElement>(null)
  const [art, setArt] = useState(vertraulichErlaubt ? 'vertrag' : 'bewilligung')
  const [titel, setTitel] = useState('')
  const [datum, setDatum] = useState('')
  const [datei, setDatei] = useState<File | null>(null)
  const optionen = arten.werte
    .filter((w) => vertraulichErlaubt || w.eigenschaften.vertraulich !== true)
    .map((w) => ({ wert: w.schluessel, text: arten.text(w.schluessel) }))

  async function speichern() {
    if (!datei) return
    const ok = await aus(
      () =>
        dokumentHochladen({
          person_id: personId,
          art,
          titel: titel.trim() || datei.name.replace(/\.[^.]+$/, ''),
          datum: datum || null,
          datei,
        }),
      { de: 'Abgelegt', fr: 'Classé' },
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
        titel={t('team.dokument.neu')}
        beschreibung={t('team.dokument.text')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft} disabled={!datei}>
              {t('team.dokument.ablegen')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld id="do-art" label={t('team.dokument.art')} pflicht>
            <Auswahl id="do-art" value={art} onValueChange={setArt} optionen={optionen} />
          </Feld>
          <Feld id="do-datum" label={t('team.dokument.datum')}>
            <Input
              id="do-datum"
              type="date"
              value={datum}
              onChange={(e) => {
                setDatum(e.target.value)
              }}
            />
          </Feld>
          <Feld id="do-titel" label={t('team.dokument.bezeichnung')} className="sm:col-span-2">
            <Input
              id="do-titel"
              placeholder={datei?.name ?? ''}
              value={titel}
              onChange={(e) => {
                setTitel(e.target.value)
              }}
            />
          </Feld>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-xs font-medium">{t('team.dokument.datei')}</span>
            {datei ? (
              <div className="bg-muted flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm">
                <span className="truncate">{datei.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('team.ausweis.dateiEntfernen')}
                  onClick={() => {
                    setDatei(null)
                  }}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <Button variant="secondary" className="self-start" onClick={() => eingabe.current?.click()}>
                <FileUp />
                {t('team.ausweis.dateiWaehlen')}
              </Button>
            )}
            <input
              ref={eingabe}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                setDatei(e.target.files?.[0] ?? null)
                e.target.value = ''
              }}
            />
          </div>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
