import { Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { melde } from '@/services/meldungen'
import { useMarketingNeuLaden } from '../../hooks/useMarketing'
import { alsParameter, messeWarteschlange, warteschlangeSenden, type MesseLead } from '../../lib/messe'
import { messeLeadSenden } from '../../services/kampagnen'
import type { Werbekampagne } from '../../types'

const leer = (kampagne: Werbekampagne): MesseLead => ({
  id: crypto.randomUUID(),
  kampagne_id: kampagne.id,
  vorname: '',
  nachname: '',
  telefon: '',
  email: '',
  plz: '',
  ort: '',
  sprache: kampagne.sprache === 'fr' ? 'fr' : 'de',
  interesse: [],
  termin: false,
  newsletter: false,
  notiz: '',
})

/**
 * Lead am Messestand erfassen, fürs Handy gebaut: wenige Felder, grosse Knöpfe. Ohne Netz bleibt der Lead im Gerät
 * und geht beim nächsten Speichern oder Öffnen mit. Die Datenbank legt Lead, Kontakt, Einwilligung (Newsletter mit
 * der Messe als Nachweis) und die Aufgabe «anrufen» an.
 */
export function MesseErfassung({ kampagne, onSchliessen }: { kampagne: Werbekampagne; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const neuLaden = useMarketingNeuLaden()
  const interessen = useAuswahl('interesse')
  const [l, setL] = useState<MesseLead>(() => leer(kampagne))
  const [wartend, setWartend] = useState(() => messeWarteschlange.alle().length)
  const [laeuft, setLaeuft] = useState(false)
  const setze = (x: Partial<MesseLead>) => {
    setL({ ...l, ...x })
  }

  async function nachsenden() {
    const n = await warteschlangeSenden((x) => messeLeadSenden(alsParameter(x)))
    setWartend(messeWarteschlange.alle().length)
    if (n) void neuLaden()
    return n
  }
  useEffect(() => {
    void nachsenden()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Öffnen
  }, [])

  async function speichern() {
    setLaeuft(true)
    messeWarteschlange.dazu(l)
    await nachsenden()
    const offen = messeWarteschlange.alle().length
    melde(
      offen ? 'warnung' : 'ok',
      offen
        ? { de: `Ohne Netz: ${String(offen)} Lead(s) im Gerät gespeichert`, fr: `Hors ligne : ${String(offen)} lead(s) gardé(s) sur l’appareil` }
        : { de: 'Lead gespeichert', fr: 'Lead enregistré' },
    )
    setL(leer(kampagne))
    setLaeuft(false)
  }

  const feld = (f: 'vorname' | 'nachname' | 'telefon' | 'email' | 'plz' | 'ort', typ = 'text') => (
    <Feld id={`messe-${f}`} label={t(`werbung.messe.feld.${f}`)} pflicht={f === 'nachname'}>
      <Input
        id={`messe-${f}`}
        type={typ}
        autoComplete="off"
        value={l[f]}
        onChange={(e) => {
          setze({ [f]: e.target.value })
        }}
      />
    </Feld>
  )
  const haken = (wert: boolean, an: (b: boolean) => void, text: string, key?: string) => (
    <label key={key} className="flex min-h-11 items-center gap-3 rounded-md border px-3 text-sm">
      <Checkbox
        checked={wert}
        onCheckedChange={(c) => {
          an(c === true)
        }}
      />
      {text}
    </label>
  )

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        titel={t('werbung.messe.erfassen', { name: kampagne.name })}
        beschreibung={wartend ? t('werbung.messe.wartend', { anzahl: wartend }) : t('werbung.messe.erfassenInfo')}
        fuss={
          <Button size="lg" onClick={() => void speichern()} laedt={laeuft} disabled={!l.nachname.trim() || (!l.telefon && !l.email)}>
            <Send />
            {t('werbung.messe.speichernNaechster')}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {feld('vorname')}
            {feld('nachname')}
            {feld('telefon', 'tel')}
            {feld('email', 'email')}
            {feld('plz')}
            {feld('ort')}
          </div>
          <div role="group" aria-label={t('werbung.messe.sprache')} className="flex gap-2">
            {(['de', 'fr'] as const).map((s) => (
              <Button
                key={s}
                variant={l.sprache === s ? 'primary' : 'secondary'}
                aria-pressed={l.sprache === s}
                onClick={() => {
                  setze({ sprache: s })
                }}
              >
                {t(`marketing.sprache.${s}`)}
              </Button>
            ))}
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">{t('werbung.messe.interesse')}</legend>
            <div className="grid grid-cols-2 gap-2">
              {interessen.werte.map((w) =>
                haken(
                  l.interesse.includes(w.schluessel),
                  (b) => {
                    setze({
                      interesse: b ? [...l.interesse, w.schluessel] : l.interesse.filter((x) => x !== w.schluessel),
                    })
                  },
                  interessen.text(w.schluessel),
                  w.schluessel,
                ),
              )}
            </div>
          </fieldset>
          {haken(l.termin, (b) => { setze({ termin: b }) }, t('werbung.messe.termin'))}
          {haken(l.newsletter, (b) => { setze({ newsletter: b }) }, t('werbung.messe.newsletter'))}
          <Feld id="messe-notiz" label={t('werbung.messe.feld.notiz')}>
            <Textarea
              id="messe-notiz"
              rows={3}
              value={l.notiz}
              onChange={(e) => {
                setze({ notiz: e.target.value })
              }}
            />
          </Feld>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
