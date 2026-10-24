import { BadgeCheck, Copy, Printer, Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KiWunschZeile } from '@/components/shared/ki/KiWunschZeile'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useDrucken } from '@/hooks/useDrucken'
import { formatDatum } from '@/lib/format'
import { rufeKi } from '@/services/ki'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { berichtBetreff, berichtFakten, berichtText, monatName } from '../lib/bericht'
import type { BerichtQuelle, Meldung } from '../services/bericht'
import { BerichtDruck } from './BerichtDruck'

interface BerichtDialogProps {
  q: BerichtQuelle
  monat: string
  laedt: boolean
  onSpeichern: (f: { bericht_text?: string; gemeldet?: Meldung }, meldung: { de: string; fr: string }) => Promise<void>
  onSchliessen: () => void
}

/**
 * Bericht an den Anbieter (V233 lbReport): Leads ohne Interesse zum Reklamieren ankreuzen (Gutschrift),
 * Empfänger und Betreff, Text aus den Zahlen. PDF, kopieren und «als gemeldet» gehen schon; Senden
 * aus Outlook kommt mit Phase 8 über den Ausgangskorb, mit Freigabe.
 */
export default function BerichtDialog({ q, monat, laedt, onSpeichern, onSchliessen }: BerichtDialogProps) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const quellen = useAuswahl('quelle')
  const ich = useAnmeldung((z) => z.ich)
  const druck = useDrucken()
  const ohne = q.leads.filter((l) => l.stand === 'kein')
  const [rek, setRek] = useState<Set<string>>(new Set())
  const [an, setAn] = useState(q.gemeldet?.an || q.empfaenger)
  const [betreff, setBetreff] = useState(berichtBetreff(monat, 'de'))
  const name = quellen.text(q.quelle) || q.quelle
  const vorschlag = (r: ReadonlySet<string>) =>
    berichtText({
      monat,
      quelle: name,
      erhalten: q.erhalten,
      gekauft: q.gekauft,
      stand: {
        inBearbeitung: q.inBearbeitung,
        termin: q.termin,
        offeriert: q.offeriert,
        keinInteresse: q.keinInteresse,
      },
      ohneInteresse: ohne,
      reklamiert: r,
      sprache: 'de',
    })
  const [text, setText] = useState(q.berichtText ?? vorschlag(rek))

  function waehle(id: string, mit: boolean) {
    const neu = new Set(rek)
    if (mit) neu.add(id)
    else neu.delete(id)
    setRek(neu)
    // Wie V233: die Auswahl schreibt den Text neu; eigene Änderungen danach bleiben bis zur nächsten Auswahl.
    setText(vorschlag(neu))
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('verkauf.bericht.dialogTitel', { quelle: name, monat: monatName(monat, sprache) })}
        beschreibung={t('verkauf.bericht.textHinweis')}
        className="max-w-2xl"
        fuss={
          <>
            <Button variant="secondary" onClick={druck.drucke}>
              <Printer />
              PDF
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard
                  .writeText(`${t('verkauf.bericht.betreff')}: ${betreff}\n\n${text}`)
                  .then(() => {
                    melde('ok', { de: 'Bericht kopiert', fr: 'Rapport copié' })
                  })
              }}
            >
              <Copy />
              {t('verkauf.bericht.kopieren')}
            </Button>
            <Button
              variant="secondary"
              laedt={laedt}
              onClick={() =>
                void onSpeichern({ bericht_text: text }, { de: 'Bericht gespeichert', fr: 'Rapport enregistré' })
              }
            >
              <Save />
              {t('verkauf.bericht.speichern')}
            </Button>
            <Button
              laedt={laedt}
              onClick={() =>
                void onSpeichern(
                  {
                    bericht_text: text,
                    gemeldet: {
                      am: new Date().toISOString(),
                      von: ich?.name ?? '',
                      an: an.trim(),
                      anzahl: q.erhalten,
                      wie: 'manuell',
                    },
                  },
                  { de: 'Als gemeldet markiert', fr: 'Marqué comme signalé' },
                ).then(onSchliessen)
              }
            >
              <BadgeCheck />
              {t('verkauf.bericht.gemeldet')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {ohne.length > 0 && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-muted-foreground mb-1 text-xs">{t('verkauf.bericht.reklamieren')}</legend>
              {ohne.map((l) => (
                <label key={l.id} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={rek.has(l.id)}
                    onCheckedChange={(c) => {
                      waehle(l.id, c === true)
                    }}
                  />
                  <span>
                    <b className="font-medium">{l.name}</b> · {formatDatum(l.eingang_am)} ·{' '}
                    {[l.plz, l.ort].filter(Boolean).join(' ')}{' '}
                    <span className="text-muted-foreground">– {l.grund ?? t('verkauf.bericht.ohneGrund')}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Feld id="bericht-an" label={t('verkauf.bericht.an')}>
              <Input
                id="bericht-an"
                type="email"
                placeholder="partner@solar-guide.ch"
                value={an}
                onChange={(e) => {
                  setAn(e.target.value)
                }}
              />
            </Feld>
            <Feld id="bericht-betreff" label={t('verkauf.bericht.betreff')}>
              <Input
                id="bericht-betreff"
                value={betreff}
                onChange={(e) => {
                  setBetreff(e.target.value)
                }}
              />
            </Feld>
          </div>
          <KiWunschZeile
            hatText={false}
            onSchreiben={async (wunsch) => {
              const stand = {
                inBearbeitung: q.inBearbeitung,
                termin: q.termin,
                offeriert: q.offeriert,
                keinInteresse: q.keinInteresse,
              }
              const r = await rufeKi<{ text: string }>('monatsbericht', {
                anbieter: name,
                fakten: berichtFakten({
                  monat,
                  erhalten: q.erhalten,
                  gekauft: q.gekauft,
                  stand,
                  ohneInteresse: ohne,
                  reklamiert: rek,
                }),
                vorlage: q.berichtText ?? '',
                aktuell: text,
                wunsch,
              })
              setText(r.text)
            }}
          />
          <Feld id="bericht-text" label={t('verkauf.bericht.text')}>
            <Textarea
              id="bericht-text"
              rows={14}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
              }}
            />
          </Feld>
          {q.berichtText && text === q.berichtText && (
            <p className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
              {t('verkauf.bericht.gespeicherterText')}
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => {
                  setText(vorschlag(rek))
                }}
              >
                {t('verkauf.bericht.neuAusZahlen')}
              </button>
            </p>
          )}
        </div>
        {druck.aktiv && (
          <BerichtDruck
            titel={`Lead-Auswertung ${monatName(monat, 'de')}`}
            unter={`Quelle: ${name}`}
            text={text}
            sprache="de"
          />
        )}
      </DialogInhalt>
    </Dialog>
  )
}
