import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf, parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { kursBesucht, kursEntscheiden, kursSpeichern } from '../services/kurse'
import type { Kurs, KursEingabe, TeamPerson } from '../types'
import { KursFluss } from './KursFluss'
import { PersonenWahl } from './PersonenWahl'

const OHNE = 'ohne'

/**
 * Kurs planen, beantragen oder ändern. Wer nicht planen darf, beantragt nur für sich (die Datenbank setzt dann
 * «beantragt» und schickt die Glocke an die Bewilligenden). Dazu im selben Fenster: bewilligen, ablehnen/absagen mit
 * Grund und «besucht» mit Häkchen, wer dabei war (dann entsteht der Ausweis).
 */
export function KursDialog({
  kurs,
  vorgabe,
  personen,
  ichId,
  allePlanen,
  vereinbarungAb,
  heute,
  onSchliessen,
}: {
  kurs: Kurs | null
  vorgabe?: { art: string; personen: string[] }
  personen: TeamPerson[]
  ichId: string
  allePlanen: boolean
  vereinbarungAb: number
  heute: string
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const quali = useAuswahl('qualifikation')
  const { laeuft, aus } = useAktion()
  const k = kurs
  const [titel, setTitel] = useState(k?.titel ?? (vorgabe ? quali.text(vorgabe.art) : ''))
  const [art, setArt] = useState(k ? (k.art ?? OHNE) : (vorgabe?.art ?? OHNE))
  const [wer, setWer] = useState<string[]>(k?.personen ?? vorgabe?.personen ?? [ichId])
  const [anbieter, setAnbieter] = useState(k?.anbieter ?? '')
  const [ort, setOrt] = useState(k?.ort ?? '')
  const [von, setVon] = useState(k?.von ?? '')
  const [bis, setBis] = useState(k?.bis ?? '')
  const [kosten, setKosten] = useState(k?.kosten_rappen != null ? formatChf(k.kosten_rappen) : '')
  const [vereinbarung, setVereinbarung] = useState(
    k?.vereinbarung_rappen != null ? formatChf(k.vereinbarung_rappen) : '',
  )
  const [bindungBis, setBindungBis] = useState(k?.vereinbarung_bis ?? '')
  const [notiz, setNotiz] = useState(k?.notiz ?? '')
  const [dabei, setDabei] = useState<string[]>(k?.personen ?? [])
  const [absage, setAbsage] = useState<string | null>(null)

  // Planen darf: Recht «personal» für alle, Vorgesetzte für die eigenen Mitarbeitenden (die Datenbank prüft nochmals).
  const planbar = personen.filter((p) => allePlanen || p.vorgesetzt_id === ichId)
  const planer = k
    ? k.darf_planen
    : allePlanen || (wer.length > 0 && wer.every((id) => planbar.some((p) => p.id === id)))
  const offen = !k || k.stand === 'beantragt' || k.stand === 'bewilligt' || k.stand === 'angemeldet'
  const eigenerAntrag = k?.stand === 'beantragt' && k.beantragt_von === ichId
  const bearbeitbar = offen && (planer || !k || eigenerAntrag)
  const auswahlPersonen =
    planer || allePlanen
      ? planbar.concat(personen.filter((p) => p.id === ichId && !planbar.includes(p)))
      : personen.filter((p) => p.id === ichId)
  const kostenRappen = kosten.trim() ? parseChf(kosten) : null
  const zeigeVereinbarung = (kostenRappen ?? 0) >= vereinbarungAb || Boolean(k?.vereinbarung_rappen)
  const gueltig =
    titel.trim() !== '' &&
    wer.length > 0 &&
    (kosten.trim() === '' || kostenRappen !== null) &&
    (!bis || !von || bis >= von)

  function eingabe(stand: KursEingabe['stand']): KursEingabe {
    return {
      titel: titel.trim(),
      art: art === OHNE ? null : art,
      anbieter: anbieter.trim() || null,
      ort: ort.trim() || null,
      von: von || null,
      bis: bis || null,
      kosten_rappen: kostenRappen,
      personen: wer,
      stand,
      vereinbarung_rappen: vereinbarung.trim() ? parseChf(vereinbarung) : null,
      vereinbarung_bis: bindungBis || null,
      notiz: notiz.trim() || null,
    }
  }
  const fertig = (ok: boolean) => {
    if (ok) onSchliessen()
  }
  // Ohne Planungsrecht immer ein Antrag; mit Datum direkt «angemeldet», sonst «bewilligt» (bei Planenden).
  // Ein offener Antrag bleibt beim Speichern ein Antrag; bewilligt wird nur mit «Bewilligen».
  const zielStand: KursEingabe['stand'] =
    !planer || k?.stand === 'beantragt' ? 'beantragt' : von ? 'angemeldet' : 'bewilligt'

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        titel={k ? k.titel : planer ? t('team.kurs.neu') : t('team.kurs.beantragen')}
        {...(k ? {} : { beschreibung: planer ? t('team.kurs.neuText') : t('team.kurs.beantragenText') })}
        fuss={
          <>
            {k && offen && (planer || eigenerAntrag) && absage === null && (
              <Button
                variant="ghost"
                className="text-bad mr-auto"
                onClick={() => {
                  setAbsage('')
                }}
              >
                <X />
                {k.stand === 'beantragt' && !eigenerAntrag ? t('team.kurs.ablehnen') : t('team.kurs.absagen')}
              </Button>
            )}
            {k?.darf_bewilligen && (
              <Button
                variant="secondary"
                laedt={laeuft}
                onClick={() =>
                  void aus(() => kursEntscheiden(k.id, true), { de: 'Bewilligt', fr: 'Approuvé' }).then(fertig)
                }
              >
                <Check />
                {t('team.kurs.bewilligen')}
              </Button>
            )}
            {bearbeitbar && (
              <Button
                laedt={laeuft}
                disabled={!gueltig}
                onClick={() =>
                  void aus(() => kursSpeichern(k?.id ?? null, eingabe(zielStand)), {
                    de: zielStand === 'beantragt' && !planer ? 'Antrag gestellt' : 'Gespeichert',
                    fr: zielStand === 'beantragt' && !planer ? 'Demande envoyée' : 'Enregistré',
                  }).then(fertig)
                }
              >
                {k && zielStand === 'beantragt' ? t('allgemein.speichern') : t(`team.kurs.speichernAls.${zielStand}`)}
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {k && <KursFluss kurs={k} />}
          {k?.absage_grund && (
            <p className="text-muted-foreground text-sm">{t('team.kurs.grund', { grund: k.absage_grund })}</p>
          )}

          {absage !== null && k && (
            <div className="bg-bad-soft flex flex-col gap-2 rounded-lg p-3">
              <Feld id="kurs-absage" label={t('team.kurs.absageGrund')}>
                <Input
                  id="kurs-absage"
                  value={absage}
                  onChange={(e) => {
                    setAbsage(e.target.value)
                  }}
                />
              </Feld>
              <span className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAbsage(null)
                  }}
                >
                  {t('allgemein.abbrechen')}
                </Button>
                <Button
                  variant="danger"
                  laedt={laeuft}
                  onClick={() =>
                    void aus(() => kursEntscheiden(k.id, false, absage), { de: 'Abgesagt', fr: 'Annulé' }).then(fertig)
                  }
                >
                  {t('team.kurs.absageBestaetigen')}
                </Button>
              </span>
            </div>
          )}

          {k?.stand === 'angemeldet' && k.darf_planen && (k.von ?? heute) <= heute && (
            <div className="bg-info-soft flex flex-col gap-3 rounded-lg p-3">
              <span className="text-sm font-medium">{t('team.kurs.werDabei')}</span>
              <PersonenWahl
                id="kurs-dabei"
                personen={personen.filter((p) => k.personen.includes(p.id))}
                gewaehlt={dabei}
                onChange={setDabei}
              />
              <Button
                className="self-start"
                laedt={laeuft}
                disabled={dabei.length === 0}
                onClick={() =>
                  void aus(() => kursBesucht(k.id, dabei), {
                    de: 'Abgeschlossen, Ausweis eingetragen',
                    fr: 'Terminé, certificat enregistré',
                  }).then(fertig)
                }
              >
                <Check />
                {t('team.kurs.besucht')}
              </Button>
            </div>
          )}

          <fieldset disabled={!bearbeitbar} className="grid gap-4 sm:grid-cols-2">
            <Feld id="kurs-titel" label={t('team.kurs.titel')} pflicht className="sm:col-span-2">
              <Input
                id="kurs-titel"
                value={titel}
                onChange={(e) => {
                  setTitel(e.target.value)
                }}
              />
            </Feld>
            <Feld
              id="kurs-art"
              label={t('team.kurs.art')}
              {...(art !== OHNE ? { hinweis: t('team.kurs.artHinweis') } : {})}
              className="sm:col-span-2"
            >
              <Auswahl
                id="kurs-art"
                value={art}
                onValueChange={setArt}
                optionen={[
                  { wert: OHNE, text: t('team.kurs.weiterbildung') },
                  ...quali.werte.map((w) => ({ wert: w.schluessel, text: quali.text(w.schluessel) })),
                ]}
              />
            </Feld>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-xs font-medium">{t('team.kurs.wer')}</span>
              <PersonenWahl
                id="kurs-wer"
                personen={auswahlPersonen}
                gewaehlt={wer}
                onChange={setWer}
                gesperrt={!planer && !allePlanen}
              />
            </div>
            <Feld id="kurs-von" label={t('team.kurs.von')} {...(planer ? { hinweis: t('team.kurs.vonHinweis') } : {})}>
              <Input
                id="kurs-von"
                type="date"
                value={von}
                onChange={(e) => {
                  setVon(e.target.value)
                }}
              />
            </Feld>
            <Feld id="kurs-bis" label={t('team.kurs.bis')} hinweis={t('team.kurs.bisHinweis')}>
              <Input
                id="kurs-bis"
                type="date"
                value={bis}
                min={von || undefined}
                onChange={(e) => {
                  setBis(e.target.value)
                }}
              />
            </Feld>
            <Feld id="kurs-anbieter" label={t('team.kurs.anbieter')}>
              <Input
                id="kurs-anbieter"
                value={anbieter}
                onChange={(e) => {
                  setAnbieter(e.target.value)
                }}
              />
            </Feld>
            <Feld id="kurs-ort" label={t('team.kurs.ort')}>
              <Input
                id="kurs-ort"
                value={ort}
                onChange={(e) => {
                  setOrt(e.target.value)
                }}
              />
            </Feld>
            {(k?.kosten_rappen !== undefined || !k) && (
              <Feld
                id="kurs-kosten"
                label={t('team.kurs.kostenChf')}
                fehler={kosten.trim() && kostenRappen === null ? t('team.lohn.betragFehler') : undefined}
              >
                <Input
                  id="kurs-kosten"
                  inputMode="decimal"
                  value={kosten}
                  onChange={(e) => {
                    setKosten(e.target.value)
                  }}
                />
              </Feld>
            )}
            {zeigeVereinbarung && (planer || k?.vereinbarung_rappen != null) && (
              <>
                <Feld
                  id="kurs-vereinbarung"
                  label={t('team.kurs.vereinbarung')}
                  hinweis={t('team.kurs.vereinbarungHinweis')}
                >
                  <Input
                    id="kurs-vereinbarung"
                    inputMode="decimal"
                    value={vereinbarung}
                    onChange={(e) => {
                      setVereinbarung(e.target.value)
                    }}
                  />
                </Feld>
                <Feld id="kurs-bindung" label={t('team.kurs.bindungBis')}>
                  <Input
                    id="kurs-bindung"
                    type="date"
                    value={bindungBis}
                    onChange={(e) => {
                      setBindungBis(e.target.value)
                    }}
                  />
                </Feld>
              </>
            )}
            <Feld id="kurs-notiz" label={t('team.kurs.notiz')} className="sm:col-span-2">
              <Textarea
                id="kurs-notiz"
                rows={2}
                value={notiz}
                onChange={(e) => {
                  setNotiz(e.target.value)
                }}
              />
            </Feld>
          </fieldset>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
