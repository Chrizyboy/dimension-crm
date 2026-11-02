import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatChf, parseChf } from '@/lib/format'
import { feldFehler } from '@/lib/formular'
import { useRegeln } from '../hooks/useSubmission'
import { BRAUCHT } from '../lib/entscheide'
import { entscheidSchema, type EntscheidFormular } from '../schema'
import type { Dossier } from '../types'

const heute = () => new Date().toISOString().slice(0, 10)

/**
 * Fragt die Angaben zu einem Entscheid ab: No-Go-Grund bei «nicht teilnehmen», Datum bei «später», Form und
 * Betrag der Eingabe, Gewinner und Betrag bei Absage, Grund ohne Öffnungsprotokoll, Auslöser beim Beobachten.
 * Gibt die Angaben so an onOk weiter, wie die Datenbank sie erwartet (Beträge in Rappen).
 */
export function EntscheidDialog({
  entscheid,
  titel,
  laeuft,
  dossier,
  onOk,
  onAbbrechen,
}: {
  entscheid: string
  titel: string
  laeuft: boolean
  dossier?: Dossier
  onOk: (angaben: Record<string, string>) => void
  onAbbrechen: () => void
}) {
  const { t } = useTranslation()
  const nogoGruende = useRegeln().data?.nogo_gruende ?? []
  const felder = BRAUCHT[entscheid] ?? []
  const protokoll = (dossier?.anbieter_anzahl ?? 0) > 0
  const [w, setW] = useState<EntscheidFormular>({
    entscheid,
    grund: '',
    datum: ['eingereicht', 'zuschlag', 'absage'].includes(entscheid) ? heute() : '',
    form: '',
    ausloeser: entscheid === 'beobachten' ? 'datum' : '',
    nogo: '',
    betrag: entscheid === 'eingereicht' && dossier?.angebot_rappen ? formatChf(dossier.angebot_rappen) : '',
    gewinner: '',
    ohne_protokoll: '',
    protokoll,
  })
  const [fehler, setFehler] = useState<Partial<Record<keyof EntscheidFormular, string>>>({})
  const setze = (f: keyof EntscheidFormular, v: string) => {
    setW({ ...w, [f]: v })
  }

  function ok() {
    const g = entscheidSchema.safeParse(w)
    if (!g.success) {
      setFehler(feldFehler(g.error.issues, t))
      return
    }
    const angaben: Record<string, string> = {}
    for (const f of felder) {
      if (f === 'betrag') {
        const r = g.data.betrag ? parseChf(g.data.betrag) : null
        if (r != null) angaben.betrag_rappen = String(r)
      } else if (f === 'ohne_protokoll') {
        if (!protokoll && g.data.ohne_protokoll) angaben.ohne_protokoll = g.data.ohne_protokoll
      } else if (g.data[f]) angaben[f] = g.data[f]
    }
    onOk(angaben)
  }

  const text = (f: 'grund' | 'gewinner' | 'ohne_protokoll', label: string, pflicht = false, hinweis?: string) => (
    <Feld id={`as-${f}`} label={label} fehler={fehler[f]} pflicht={pflicht} {...(hinweis ? { hinweis } : {})}>
      <Input
        id={`as-${f}`}
        value={w[f]}
        onChange={(e) => {
          setze(f, e.target.value)
        }}
      />
    </Feld>
  )

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onAbbrechen()
      }}
    >
      <DialogInhalt
        titel={titel}
        fuss={
          <>
            <Button variant="ghost" onClick={onAbbrechen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button
              onClick={ok}
              laedt={laeuft}
              variant={['verwerfen', 'ablehnen'].includes(entscheid) ? 'danger' : 'primary'}
            >
              {t('ausschreibungen.bestaetigen')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {entscheid === 'zuschlag' && (
            <p className="text-muted-foreground text-sm">{t('ausschreibungen.entscheidHilfe.zuschlag')}</p>
          )}
          {felder.includes('nogo') && (
            <Feld id="as-nogo" label={t('ausschreibungen.feld.nogo')} fehler={fehler.nogo} pflicht>
              <Auswahl
                id="as-nogo"
                value={w.nogo}
                platzhalter="–"
                onValueChange={(v) => {
                  setze('nogo', v)
                }}
                optionen={nogoGruende.map((g) => ({ wert: g, text: t(`ausschreibungen.nogo.${g}`) }))}
              />
            </Feld>
          )}
          {felder.includes('ausloeser') && (
            <Feld id="as-ausloeser" label={t('ausschreibungen.feld.ausloeser')}>
              <Auswahl
                id="as-ausloeser"
                value={w.ausloeser}
                onValueChange={(v) => {
                  setze('ausloeser', v)
                }}
                optionen={['datum', 'zuschlag', 'planer', 'baubewilligung'].map((a) => ({
                  wert: a,
                  text: t(`ausschreibungen.ausloeser.${a}`),
                }))}
              />
            </Feld>
          )}
          {felder.includes('datum') && (entscheid !== 'beobachten' || w.ausloeser === 'datum') && (
            <Feld id="as-datum" label={t(`ausschreibungen.feld.datum_${entscheid}`)} fehler={fehler.datum} pflicht>
              <Input
                id="as-datum"
                type="date"
                value={w.datum}
                onChange={(e) => {
                  setze('datum', e.target.value)
                }}
              />
            </Feld>
          )}
          {felder.includes('form') && (
            <Feld id="as-form" label={t('ausschreibungen.feld.form')} fehler={fehler.form} pflicht>
              <Auswahl
                id="as-form"
                value={w.form}
                platzhalter={t('ausschreibungen.feld.formWaehlen')}
                onValueChange={(v) => {
                  setze('form', v)
                }}
                optionen={['simap', 'post', 'mail', 'hand'].map((f) => ({
                  wert: f,
                  text: t(`ausschreibungen.form.${f}`),
                }))}
              />
            </Feld>
          )}
          {felder.includes('betrag') && (
            <Feld
              id="as-betrag"
              label={t(`ausschreibungen.feld.betrag_${entscheid}`)}
              hinweis={t('ausschreibungen.akte.exklMwst')}
              fehler={fehler.betrag}
              pflicht={entscheid === 'eingereicht'}
            >
              <Input
                id="as-betrag"
                inputMode="decimal"
                value={w.betrag}
                placeholder="CHF"
                onChange={(e) => {
                  setze('betrag', e.target.value)
                }}
              />
            </Feld>
          )}
          {felder.includes('gewinner') &&
            text(
              'gewinner',
              t('ausschreibungen.feld.gewinner'),
              false,
              protokoll ? t('ausschreibungen.feld.gewinnerHinweis') : undefined,
            )}
          {felder.includes('ohne_protokoll') &&
            !protokoll &&
            text(
              'ohne_protokoll',
              t('ausschreibungen.feld.ohneProtokoll'),
              true,
              t('ausschreibungen.feld.ohneProtokollHinweis'),
            )}
          {felder.includes('grund') &&
            text(
              'grund',
              t(entscheid === 'nicht_teilnehmen' ? 'ausschreibungen.feld.grundZusatz' : 'ausschreibungen.feld.grund'),
              ['verwerfen', 'ablehnen'].includes(entscheid),
            )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
