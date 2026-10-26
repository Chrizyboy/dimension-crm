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
import { ausweisArten, gueltigBisVorschlag } from '../lib/matrix'
import { ausweisSchema } from '../schema'
import { ausweisEntfernen, ausweisSpeichern, dateiHochladen } from '../services/personal'
import type { Qualifikation } from '../types'

/**
 * Kurs oder Ausweis erfassen oder ändern, mit Foto oder PDF der Bestätigung. «Gültig bis» schlägt das CRM aus der
 * Gültigkeit der Art vor (z. B. Absturzsicherung 2 Jahre); ein neuer Kurs ersetzt den alten in der Übersicht.
 */
export function AusweisDialog({
  personId,
  ausweis,
  vorgabeArt,
  onSchliessen,
}: {
  personId: string
  ausweis: Qualifikation | null
  vorgabeArt?: string
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const auswahl = useAuswahl('qualifikation')
  const arten = ausweisArten(auswahl.werte)
  const { laeuft, aus } = useAktion()
  const a = ausweis
  const [art, setArt] = useState(a?.art ?? vorgabeArt ?? '')
  const [erworben, setErworben] = useState(a?.erworben_am ?? '')
  const [bis, setBis] = useState(a?.gueltig_bis ?? '')
  const [bezeichnung, setBezeichnung] = useState(a?.bezeichnung ?? '')
  const [aussteller, setAussteller] = useState(a?.aussteller ?? '')
  const [datei, setDatei] = useState<File | null>(null)
  const eingabe = useRef<HTMLInputElement>(null)
  const monate = arten.find((x) => x.schluessel === art)?.gueltig_monate ?? null
  const gueltig = ausweisSchema.safeParse({ art, erworben_am: erworben || null, gueltig_bis: bis || null }).success

  async function speichern() {
    const ok = await aus(
      async () => {
        const pfad = datei ? await dateiHochladen(personId, datei) : (a?.datei_pfad ?? null)
        await ausweisSpeichern(
          {
            person_id: personId,
            art,
            bezeichnung: bezeichnung.trim() || null,
            erworben_am: erworben || null,
            gueltig_bis: bis || null,
            aussteller: aussteller.trim() || null,
            datei_pfad: pfad,
            notiz: a?.notiz ?? null,
          },
          a?.id,
        )
      },
      { de: 'Gespeichert', fr: 'Enregistré' },
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
        titel={a ? t('team.ausweis.bearbeiten') : t('team.ausweis.neu')}
        fuss={
          <>
            {a && (
              <Button
                variant="ghost"
                className="text-bad mr-auto"
                laedt={laeuft}
                onClick={() => {
                  void aus(() => ausweisEntfernen(a.id), { de: 'Im Papierkorb', fr: 'Dans la corbeille' }).then(
                    (ok) => {
                      if (ok) onSchliessen()
                    },
                  )
                }}
              >
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
          <Feld id="aw-art" label={t('team.ausweis.art')} pflicht className="sm:col-span-2">
            <Auswahl
              id="aw-art"
              value={art}
              platzhalter={t('team.ausweis.artWaehlen')}
              onValueChange={(v) => {
                setArt(v)
                const m = arten.find((x) => x.schluessel === v)?.gueltig_monate ?? null
                if (erworben && !bis) setBis(gueltigBisVorschlag(erworben, m))
              }}
              optionen={auswahl.werte.map((w) => ({ wert: w.schluessel, text: auswahl.text(w.schluessel) }))}
            />
          </Feld>
          <Feld id="aw-erworben" label={t('team.ausweis.erworben')}>
            <Input
              id="aw-erworben"
              type="date"
              value={erworben}
              onChange={(e) => {
                setErworben(e.target.value)
                if (!bis) setBis(gueltigBisVorschlag(e.target.value, monate))
              }}
            />
          </Feld>
          <Feld
            id="aw-bis"
            label={t('team.ausweis.gueltigBis')}
            hinweis={monate ? t('team.ausweis.gueltigMonate', { count: monate }) : t('team.ausweis.unbefristet')}
          >
            <Input
              id="aw-bis"
              type="date"
              value={bis}
              onChange={(e) => {
                setBis(e.target.value)
              }}
            />
          </Feld>
          <Feld id="aw-bez" label={t('team.ausweis.bezeichnung')}>
            <Input
              id="aw-bez"
              value={bezeichnung}
              onChange={(e) => {
                setBezeichnung(e.target.value)
              }}
            />
          </Feld>
          <Feld id="aw-aussteller" label={t('team.ausweis.aussteller')}>
            <Input
              id="aw-aussteller"
              value={aussteller}
              onChange={(e) => {
                setAussteller(e.target.value)
              }}
            />
          </Feld>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-xs font-medium">{t('team.ausweis.datei')}</span>
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
                {a?.datei_pfad ? t('team.ausweis.dateiErsetzen') : t('team.ausweis.dateiWaehlen')}
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
