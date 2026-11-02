import { Mail, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { formatDatum } from '@/lib/format'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../../hooks/useAktion'
import { useKampagnenLeads, usePersonen } from '../../hooks/useKampagnen'
import { useVorlagen, useZielgruppe } from '../../hooks/useMarketing'
import { checkliste, messeTage, standdienst } from '../../lib/messe'
import { speichereKampagne } from '../../services/kampagnen'
import type { Checkpunkt, Standdienst, Werbekampagne } from '../../types'
import { SerienDialog } from '../SerienDialog'
import { MesseErfassung } from './MesseErfassung'

/**
 * Messe-Teil der Kampagnen-Akte: Leads am Stand erfassen (Handy, offline), Standdienst je Tag mit Kürzeln,
 * Checkliste aus der Vorlage und nach der Messe die Dankes-Mail an alle Besucher (Ausgangskorb, Klick = Freigabe).
 */
export function MesseTeil({ kampagne }: { kampagne: Werbekampagne }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const vorlagen = useVorlagen().data
  const personen = usePersonen().data ?? []
  const leads = (useKampagnenLeads().data ?? []).filter((l) => l.kampagne_id === kampagne.id)
  const ziel = useZielgruppe()
  const { aus } = useAktion()
  const [erfassen, setErfassen] = useState(false)
  const [danke, setDanke] = useState(false)
  const punkte = checkliste(kampagne.details.checkliste, vorlagen?.messe_checkliste)
  const dienst = standdienst(kampagne.details.standdienst, messeTage(kampagne.start_am, kampagne.ende_am))

  const speichern = (details: Partial<Werbekampagne['details']>) =>
    aus(() => speichereKampagne({ id: kampagne.id, name: kampagne.name, details: { ...kampagne.details, ...details } }))
  const setzePunkt = (i: number, p: Partial<Checkpunkt>) =>
    speichern({ checkliste: punkte.map((x, j) => (j === i ? { ...x, ...p } : x)) })
  const setzeDienst = (i: number, d: Partial<Standdienst>) =>
    speichern({ standdienst: dienst.map((x, j) => (j === i ? { ...x, ...d } : x)) })
  const kuerzel = (ids: string[]) => ids.map((id) => personen.find((p) => p.id === id)?.kuerzel ?? '').join(' ')
  const ausKuerzeln = (text: string) =>
    text
      .toUpperCase()
      .split(/[\s,]+/)
      .map((k) => personen.find((p) => p.kuerzel.toUpperCase() === k)?.id)
      .filter((x): x is string => Boolean(x))

  const besucher = new Set(leads.map((l) => l.kontakt_id))
  const empfaenger = (ziel.data ?? []).filter((k) => besucher.has(k.id))
  const ersetzen = (s: string) => s.replaceAll('{Messe}', kampagne.name)
  const dankeTexte = vorlagen?.messe_danke && {
    de: { betreff: ersetzen(vorlagen.messe_danke.de.betreff), text: ersetzen(vorlagen.messe_danke.de.text) },
    fr: { betreff: ersetzen(vorlagen.messe_danke.fr.betreff), text: ersetzen(vorlagen.messe_danke.fr.text) },
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <Button
          size="lg"
          onClick={() => {
            setErfassen(true)
          }}
        >
          <Smartphone />
          {t('werbung.messe.leadErfassen')}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          disabled={!empfaenger.length || !vorlagen}
          onClick={() => {
            setDanke(true)
          }}
        >
          <Mail />
          {t('werbung.messe.danke', { anzahl: empfaenger.length })}
        </Button>
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t('werbung.messe.standdienst')}</h3>
        {dienst.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('werbung.messe.ohneDatum')}</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {dienst.map((d, i) => (
              <li key={d.tag} className="grid grid-cols-[6rem_1fr_1fr_2fr] items-center gap-2 px-3 py-2">
                <span className="zahlen font-medium">{formatDatum(d.tag)}</span>
                {(['von', 'bis'] as const).map((f) => (
                  <Input
                    key={f}
                    type="time"
                    aria-label={t(`werbung.messe.${f}`)}
                    defaultValue={d[f]}
                    onBlur={(e) => {
                      if (e.target.value !== d[f]) void setzeDienst(i, { [f]: e.target.value })
                    }}
                  />
                ))}
                <Input
                  aria-label={t('werbung.messe.personen')}
                  placeholder={t('werbung.messe.kuerzelHinweis')}
                  defaultValue={kuerzel(d.personen)}
                  onBlur={(e) => {
                    const ids = ausKuerzeln(e.target.value)
                    if (ids.join() !== d.personen.join()) void setzeDienst(i, { personen: ids })
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">
          {t('werbung.messe.checkliste', {
            erledigt: punkte.filter((p) => p.erledigt).length,
            von: punkte.length,
          })}
        </h3>
        <ul className="flex flex-col gap-1">
          {punkte.map((p, i) => (
            <li key={p.text}>
              <label className="hover:bg-muted flex items-center gap-3 rounded-md px-2 py-1.5 text-sm">
                <Checkbox
                  checked={p.erledigt}
                  onCheckedChange={(c) => {
                    void setzePunkt(i, { erledigt: c === true, von: ich?.kuerzel ?? null, am: new Date().toISOString() })
                  }}
                />
                <span className={p.erledigt ? 'text-muted-foreground line-through' : ''}>{p.text}</span>
                {p.erledigt && p.von && <span className="text-muted-foreground ml-auto text-xs">{p.von}</span>}
              </label>
            </li>
          ))}
        </ul>
      </section>

      {erfassen && (
        <MesseErfassung
          kampagne={kampagne}
          onSchliessen={() => {
            setErfassen(false)
          }}
        />
      )}
      {danke && vorlagen && (
        <SerienDialog
          art="mail"
          auswahl={empfaenger}
          vorlagen={vorlagen}
          kampagneId={kampagne.id}
          werbepause={false}
          {...(dankeTexte ? { texteStart: dankeTexte } : {})}
          onSchliessen={() => {
            setDanke(false)
          }}
        />
      )}
    </div>
  )
}
