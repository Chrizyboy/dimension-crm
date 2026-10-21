import { useQuery } from '@tanstack/react-query'
import { CopyCheck, Save } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatTelefon } from '@/lib/format'
import { formatKundennummer } from '@/lib/kontakt'
import { feldFehler } from '@/lib/formular'
import { cn } from '@/lib/utils'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAussendienst, useOrte, useVerkaufAenderung } from '../hooks/useVerkauf'
import { fachFehlerSchluessel } from '@/services/fachfehler'
import { heuteIso } from '../lib/geschaeft'
import { leadSchema, leererLead, type LeadEingabe } from '../schema'
import { legeLeadAn, plzAuskunft, plzVorschlaege, pruefeLeadDubletten } from '../services/leads'

type Dublette = Awaited<ReturnType<typeof pruefeLeadDubletten>>[number]
const LEER = '_leer'

/**
 * Neuen Lead erfassen (V233 «+ Lead»): Kontakt, Adresse mit PLZ-Vorschlägen, Quelle und Interesse.
 * Aus der PLZ kommen Ort, Standort (Muri/Bulle) und Sprache. Vor dem Speichern prüft das CRM auf Dubletten;
 * ein bestehender Kontakt kann übernommen werden, damit niemand doppelt im Adressbuch steht.
 */
export default function LeadDialog({ onSchliessen }: { onSchliessen: (id: string | null) => void }) {
  const { t } = useTranslation()
  const quellen = useAuswahl('quelle')
  const gebaeudearten = useAuswahl('gebaeudeart')
  const interessen = useAuswahl('interesse')
  const erreichbarkeit = useAuswahl('erreichbarkeit')
  const personen = useAussendienst()
  const orte = useOrte()
  const [w, setW] = useState<LeadEingabe>(() => leererLead(heuteIso()))
  const [fehler, setFehler] = useState<Partial<Record<keyof LeadEingabe, string>>>({})
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [dubletten, setDubletten] = useState<Dublette[] | null>(null)
  const [standortAuto, setStandortAuto] = useState<string | null>(null)
  const plzText = useDeferredValue(w.plz || w.ort)
  const vorschlaege = useQuery({
    queryKey: ['plz', 'vorschlag', plzText],
    queryFn: () => plzVorschlaege(plzText),
    enabled: plzText.length >= 2,
    staleTime: 60 * 60_000,
  })
  const speichern = useVerkaufAenderung(({ e, kontakt }: { e: LeadEingabe; kontakt: string | null }) =>
    legeLeadAn(e, kontakt),
  )
  const setze = <K extends keyof LeadEingabe>(feld: K, wert: LeadEingabe[K]) => {
    setW((alt) => ({ ...alt, [feld]: wert }))
    if (feld === 'vorname' || feld === 'nachname' || feld === 'email' || feld === 'telefon') setDubletten(null)
  }

  /** PLZ fertig getippt: Ort, Standort und Sprache aus dem Verzeichnis übernehmen. */
  async function plzFertig(plz: string) {
    if (!/^\d{4}$/.test(plz)) return
    const a = await plzAuskunft(plz).catch(() => null)
    if (!a) return
    const standortId = a.standort ? (orte.data?.standortIds[a.standort] ?? null) : null
    setStandortAuto(a.standort)
    setW((alt) => ({
      ...alt,
      ort: alt.ort || a.ort,
      standortId: alt.standortId ?? standortId,
      sprache: alt.sprache ?? a.sprache,
    }))
  }

  async function absenden(kontakt: string | null = null) {
    const geprueft = leadSchema.safeParse(w)
    if (!geprueft.success) {
      setFehler(feldFehler(geprueft.error.issues, t))
      return
    }
    setFehler({})
    try {
      // Erster Klick prüft auf Dubletten; wer die Warnung gesehen hat, speichert mit dem zweiten.
      if (dubletten === null && kontakt === null) {
        const treffer = await pruefeLeadDubletten(geprueft.data)
        setDubletten(treffer)
        if (treffer.length) return
      }
      const id = await speichern.mutateAsync({ e: geprueft.data, kontakt })
      melde('ok', { de: 'Lead angelegt', fr: 'Lead créé' })
      onSchliessen(id)
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'lead')
      setHinweis(t(s ?? 'fachfehler.allgemein'))
    }
  }

  const text = (feld: keyof LeadEingabe, label: string, extra: Partial<React.ComponentProps<typeof Input>> = {}) => (
    <Feld id={`lead-${feld}`} label={label} fehler={fehler[feld]}>
      <Input
        id={`lead-${feld}`}
        value={String(w[feld] ?? '')}
        aria-invalid={fehler[feld] ? true : undefined}
        onChange={(e) => {
          setze(feld, e.target.value as never)
        }}
        {...extra}
      />
    </Feld>
  )

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen(null)
      }}
    >
      <DialogInhalt
        titel={t('verkauf.neu')}
        className="max-w-2xl"
        fuss={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                onSchliessen(null)
              }}
            >
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} onClick={() => void absenden()}>
              <Save />
              {dubletten?.length ? t('verkauf.lead.trotzdem') : t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void absenden()
          }}
        >
          {dubletten && dubletten.length > 0 && (
            <div role="alert" className="bg-warn-soft flex flex-col gap-2 rounded-md p-3 text-sm">
              <p className="text-warn flex items-center gap-2 font-medium">
                <CopyCheck className="size-4" aria-hidden="true" />
                {t('verkauf.lead.dubletten', { count: dubletten.length })}
              </p>
              <ul className="flex flex-col gap-1">
                {dubletten.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">
                      {d.name} · {formatKundennummer(d.kundennummer)} · {d.ort}{' '}
                      <span className="text-muted-foreground text-xs">({t(`verkauf.lead.grund.${d.grund}`)})</span>
                    </span>
                    <Button size="sm" variant="secondary" onClick={() => void absenden(d.id)}>
                      {t('verkauf.lead.uebernehmen')}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-[6rem_1fr_1fr]">
            {text('anrede', t('verkauf.lead.anrede'))}
            {text('vorname', t('verkauf.lead.vorname'), { autoFocus: true })}
            {text('nachname', t('verkauf.lead.nachname'))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {text('telefon', t('verkauf.akte.telefon'), {
              type: 'tel',
              onBlur: (e) => {
                if (e.target.value) setze('telefon', formatTelefon(e.target.value))
              },
            })}
            {text('email', t('verkauf.akte.email'), { type: 'email' })}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_6rem_1fr]">
            {text('strasse', t('verkauf.lead.strasse'))}
            {text('plz', t('verkauf.lead.plz'), {
              inputMode: 'numeric',
              maxLength: 4,
              list: 'lead-plz-liste',
              onBlur: (e) => void plzFertig(e.target.value),
              onChange: (e) => {
                setze('plz', e.target.value)
                if (e.target.value.length === 4) void plzFertig(e.target.value)
              },
            })}
            {text('ort', t('verkauf.lead.ort'), {
              list: 'lead-ort-liste',
              onChange: (e) => {
                const v = e.target.value
                const treffer = vorschlaege.data?.find((x) => `${x.plz} ${x.ort}` === v)
                if (treffer) {
                  setW((alt) => ({ ...alt, plz: treffer.plz, ort: treffer.ort }))
                  void plzFertig(treffer.plz)
                } else setze('ort', v)
              },
            })}
            <datalist id="lead-plz-liste">
              {(vorschlaege.data ?? []).map((x) => (
                <option key={`${x.plz}-${x.ort}`} value={x.plz}>
                  {x.ort}
                </option>
              ))}
            </datalist>
            <datalist id="lead-ort-liste">
              {(vorschlaege.data ?? []).map((x) => (
                <option key={`${x.plz}-${x.ort}`} value={`${x.plz} ${x.ort}`} />
              ))}
            </datalist>
          </div>
          {standortAuto && (
            <p className="text-muted-foreground -mt-2 text-xs">
              {t('verkauf.lead.standortAuto', {
                standort: standortAuto === 'muri' ? 'Muri' : 'Bulle',
                sprache: (w.sprache ?? 'de').toUpperCase(),
              })}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <Feld id="lead-quelle" label={t('verkauf.quelle')}>
              <Auswahl
                id="lead-quelle"
                value={w.quelle || LEER}
                onValueChange={(v) => {
                  setze('quelle', v === LEER ? '' : v)
                }}
                optionen={[
                  { wert: LEER, text: '–' },
                  ...quellen.werte.map((q) => ({ wert: q.schluessel, text: quellen.text(q.schluessel) })),
                ]}
              />
            </Feld>
            {text('eingangAm', t('verkauf.akte.eingang'), { type: 'date' })}
            <Feld id="lead-person" label={t('verkauf.terminBei')}>
              <Auswahl
                id="lead-person"
                value={w.personId ?? LEER}
                onValueChange={(v) => {
                  setze('personId', v === LEER ? null : v)
                }}
                optionen={[
                  { wert: LEER, text: '–' },
                  ...(personen.data ?? []).map((p) => ({ wert: p.id, text: p.name })),
                ]}
              />
            </Feld>
            <Feld id="lead-gebaeude" label={t('verkauf.lead.gebaeude')}>
              <Auswahl
                id="lead-gebaeude"
                value={w.gebaeudeart || LEER}
                onValueChange={(v) => {
                  setze('gebaeudeart', v === LEER ? '' : v)
                }}
                optionen={[
                  { wert: LEER, text: '–' },
                  ...gebaeudearten.werte.map((g) => ({ wert: g.schluessel, text: gebaeudearten.text(g.schluessel) })),
                ]}
              />
            </Feld>
            <Feld id="lead-erreichbar" label={t('verkauf.akte.erreichbarkeit')}>
              <Auswahl
                id="lead-erreichbar"
                value={w.erreichbarkeit || LEER}
                onValueChange={(v) => {
                  setze('erreichbarkeit', v === LEER ? '' : v)
                }}
                optionen={[
                  { wert: LEER, text: '–' },
                  ...erreichbarkeit.werte.map((g) => ({ wert: g.schluessel, text: erreichbarkeit.text(g.schluessel) })),
                ]}
              />
            </Feld>
            <Feld id="lead-sprache" label={t('verkauf.akte.sprache')}>
              <Auswahl
                id="lead-sprache"
                value={w.sprache ?? 'de'}
                onValueChange={(v) => {
                  setze('sprache', v === 'fr' ? 'fr' : 'de')
                }}
                optionen={[
                  { wert: 'de', text: 'Deutsch' },
                  { wert: 'fr', text: 'Français' },
                ]}
              />
            </Feld>
          </div>
          <div role="group" aria-label={t('verkauf.akte.interesse')} className="flex flex-wrap gap-1.5">
            {interessen.werte.map((i) => {
              const an = w.interesse.includes(i.schluessel)
              return (
                <button
                  key={i.schluessel}
                  type="button"
                  aria-pressed={an}
                  onClick={() => {
                    setze(
                      'interesse',
                      an ? w.interesse.filter((x) => x !== i.schluessel) : [...w.interesse, i.schluessel],
                    )
                  }}
                  className={cn(
                    'focus-visible:ring-ring h-7 rounded-full border px-3 text-xs font-medium outline-none focus-visible:ring-2',
                    an ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted',
                  )}
                >
                  {interessen.text(i.schluessel)}
                </button>
              )
            })}
          </div>
          <Feld id="lead-kommentar" label={t('verkauf.akte.kommentarKunde')}>
            <Textarea
              id="lead-kommentar"
              rows={2}
              value={w.kommentar}
              onChange={(e) => {
                setze('kommentar', e.target.value)
              }}
            />
          </Feld>
          {hinweis && (
            <p role="alert" className="text-bad text-sm">
              {hinweis}
            </p>
          )}
        </form>
      </DialogInhalt>
    </Dialog>
  )
}
