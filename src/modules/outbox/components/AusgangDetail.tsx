import { Ban, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { feldFehler } from '@/lib/formular'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { ausgangJetztSenden, fehlerText, meldeIntegrationsFehler } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { STATUS_TON, zeitpunkt } from '../lib/anzeige'
import { aenderungSchema, type AusgangAenderung } from '../schema'
import { aendern, freigeben, verwerfen } from '../services/ausgang'
import type { AusgangEintrag } from '../types'

/** HTML einer Mail als reiner Text (nie als HTML anzeigen: fremde Inhalte sind Daten). */
function alsText(html: string): string {
  const d = new DOMParser().parseFromString(html.replace(/<br\s*\/?>/gi, '\n'), 'text/html')
  return d.body.textContent.trim()
}

/**
 * Ein Eintrag im Ausgangskorb als Seitenblatt: lesen, vor der Freigabe ändern, freigeben und senden
 * oder verwerfen. Senden heisst immer: ein Mensch hat den Text gesehen (Regel 6).
 */
export function AusgangDetail({
  eintrag,
  onSchliessen,
  onGeaendert,
}: {
  eintrag: AusgangEintrag
  onSchliessen: () => void
  onGeaendert: () => void
}) {
  const { t } = useTranslation()
  const offen = eintrag.status === 'wartet' || eintrag.status === 'fehler'
  const [w, setW] = useState<AusgangAenderung>({
    kanal: eintrag.kanal,
    an: eintrag.an,
    cc: eintrag.cc ?? '',
    betreff: eintrag.betreff ?? '',
    text: eintrag.text ?? (eintrag.html ? alsText(eintrag.html) : ''),
  })
  const [fehler, setFehler] = useState<Partial<Record<keyof AusgangAenderung, string>>>({})
  const [grund, setGrund] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  async function ausfuehren(f: () => Promise<void>) {
    setLaeuft(true)
    try {
      await f()
      onGeaendert()
    } catch (e) {
      const s = fachFehlerSchluessel(e)
      if (s) melde('kritisch', zweisprachig(s))
      else if (e instanceof Error && e.name === 'IntegrationsFehler') meldeIntegrationsFehler(e)
      else {
        meldeFehler(e, 'ausgang')
        melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
      }
    } finally {
      setLaeuft(false)
    }
  }

  const geaendert =
    w.an !== eintrag.an ||
    w.cc !== (eintrag.cc ?? '') ||
    w.betreff !== (eintrag.betreff ?? '') ||
    w.text !== (eintrag.text ?? '')

  function senden() {
    const g = aenderungSchema.safeParse(w)
    if (!g.success) {
      setFehler(feldFehler(g.error.issues, t))
      return
    }
    setFehler({})
    void ausfuehren(async () => {
      if (geaendert) await aendern(eintrag.id, g.data)
      await freigeben([eintrag.id])
      const r = await ausgangJetztSenden().catch(() => null)
      melde(
        r && r.fehler === 0 ? 'ok' : 'info',
        r && r.fehler === 0
          ? { de: 'Gesendet', fr: 'Envoyé' }
          : { de: 'Freigegeben – wird in Kürze gesendet', fr: 'Approuvé – envoi sous peu' },
      )
      onSchliessen()
    })
  }

  const fuss = offen ? (
    <>
      <Button
        variant="ghost"
        onClick={() => {
          setGrund('')
        }}
        disabled={laeuft}
      >
        <Ban />
        {t('ausgang.verwerfen')}
      </Button>
      <Button onClick={senden} laedt={laeuft}>
        <Send />
        {t('ausgang.freigebenSenden')}
      </Button>
    </>
  ) : eintrag.status === 'freigegeben' ? (
    <Button
      laedt={laeuft}
      onClick={() =>
        void ausfuehren(async () => {
          await ausgangJetztSenden()
        })
      }
    >
      <Send />
      {t('ausgang.jetztSenden')}
    </Button>
  ) : undefined

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        titel={eintrag.kanal === 'sms' ? t('ausgang.titelSms') : t('ausgang.titelMail')}
        beschreibung={eintrag.kunde ?? eintrag.an}
        {...(fuss ? { fuss } : {})}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge ton={STATUS_TON[eintrag.status]} punkt>
              {t(`ausgang.status.${eintrag.status}`)}
            </Badge>
            {eintrag.automatisch && <Badge ton="info">{t('ausgang.automatisch')}</Badge>}
            <Badge>{t(`ausgang.art.${eintrag.art}`, { defaultValue: eintrag.art })}</Badge>
          </div>
          {eintrag.status === 'fehler' && eintrag.fehler && (
            <p role="alert" className="bg-bad-soft text-bad rounded-md p-3 text-sm">
              {fehlerText(new Error(eintrag.fehler))}
            </p>
          )}

          {offen ? (
            <div className="flex flex-col gap-3">
              <Feld id="ausgang-an" label={t('ausgang.an')} fehler={fehler.an} pflicht>
                <Input
                  id="ausgang-an"
                  value={w.an}
                  onChange={(e) => {
                    setW({ ...w, an: e.target.value })
                  }}
                />
              </Feld>
              {eintrag.kanal === 'mail' && (
                <>
                  <Feld id="ausgang-cc" label={t('ausgang.cc')}>
                    <Input
                      id="ausgang-cc"
                      value={w.cc}
                      onChange={(e) => {
                        setW({ ...w, cc: e.target.value })
                      }}
                    />
                  </Feld>
                  <Feld id="ausgang-betreff" label={t('ausgang.betreff')} fehler={fehler.betreff} pflicht>
                    <Input
                      id="ausgang-betreff"
                      value={w.betreff}
                      onChange={(e) => {
                        setW({ ...w, betreff: e.target.value })
                      }}
                    />
                  </Feld>
                </>
              )}
              <Feld id="ausgang-text" label={t('ausgang.text')} fehler={fehler.text} pflicht>
                <Textarea
                  id="ausgang-text"
                  rows={eintrag.kanal === 'sms' ? 4 : 10}
                  value={w.text}
                  onChange={(e) => {
                    setW({ ...w, text: e.target.value })
                  }}
                />
              </Feld>
              {eintrag.kanal === 'sms' && (
                <p className="text-muted-foreground text-xs">{t('ausgang.zeichen', { count: w.text.length })}</p>
              )}
            </div>
          ) : (
            <AkteAbschnitt titel={t('ausgang.inhalt')}>
              <Angabe label={t('ausgang.an')}>{eintrag.an}</Angabe>
              {eintrag.cc && <Angabe label={t('ausgang.cc')}>{eintrag.cc}</Angabe>}
              {eintrag.betreff && <Angabe label={t('ausgang.betreff')}>{eintrag.betreff}</Angabe>}
              <p className="bg-muted/60 rounded-md p-3 text-sm whitespace-pre-wrap">{w.text}</p>
            </AkteAbschnitt>
          )}

          {eintrag.anhaenge.length > 0 && (
            <AkteAbschnitt titel={t('ausgang.anhaenge')}>
              <ul className="text-sm">
                {eintrag.anhaenge.map((a) => (
                  <li key={a.dokument_id}>{a.name ?? a.dokument_id}</li>
                ))}
              </ul>
            </AkteAbschnitt>
          )}

          <AkteAbschnitt titel={t('ausgang.ablauf')}>
            <Angabe label={t('ausgang.erstellt')}>{zeitpunkt(eintrag.erstellt_am)}</Angabe>
            <Angabe label={t('ausgang.absender')}>{eintrag.absender ?? t('ausgang.system')}</Angabe>
            {eintrag.freigegeben_am && (
              <Angabe label={t('ausgang.freigegeben')}>
                {zeitpunkt(eintrag.freigegeben_am)} · {eintrag.freigegeben_durch ?? t('ausgang.automatisch')}
              </Angabe>
            )}
            {eintrag.gesendet_am && <Angabe label={t('ausgang.gesendet')}>{zeitpunkt(eintrag.gesendet_am)}</Angabe>}
            {eintrag.verworfen_grund && <Angabe label={t('ausgang.grund')}>{eintrag.verworfen_grund}</Angabe>}
          </AkteAbschnitt>

          {grund !== null && (
            <div className="flex flex-col gap-2 rounded-lg border p-3">
              <Feld id="ausgang-grund" label={t('ausgang.grundFrage')}>
                <Input
                  id="ausgang-grund"
                  value={grund}
                  onChange={(e) => {
                    setGrund(e.target.value)
                  }}
                  autoFocus
                />
              </Feld>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setGrund(null)
                  }}
                >
                  {t('allgemein.abbrechen')}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  laedt={laeuft}
                  onClick={() =>
                    void ausfuehren(async () => {
                      await verwerfen(eintrag.id, grund)
                      melde('ok', { de: 'Verworfen – wird nicht gesendet', fr: 'Rejeté – ne sera pas envoyé' })
                      onSchliessen()
                    })
                  }
                >
                  {t('ausgang.verwerfen')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
