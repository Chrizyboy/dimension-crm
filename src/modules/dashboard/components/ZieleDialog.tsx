import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatChf, parseChf } from '@/lib/format'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useKzEinstellungenSpeichern } from '../hooks/useKennzahlen'
import type { JahresZiel, KennzahlenEinstellungen } from '../types'

const WAHRSCHEINLICHKEIT = ['offeriert', 'nachfassen', 'vertagt', 'alt'] as const
const RICHTWERTE = [
  'unterschrift_ibn_tage',
  'reaktion_prozent',
  'marge_prozent',
  'fristen_ueberfaellig',
  'material_spaet',
  'faelle_dauer',
] as const

/** Betrag in Franken als Text für ein Feld (leer ohne Wert). */
const alsText = (rappen: number | null | undefined) => (rappen ? formatChf(rappen).replace(/\.00$/, '') : '')

/**
 * Ziele eines Jahres (K1 A: je Firma und Person, von der Geschäftsleitung), Abschluss-Wahrscheinlichkeit je Stand
 * (K2 A) und Richtwerte für «Was auffällt». Speichern prüft die Datenbank (Recht «finanzen», Grenzen).
 */
export function ZieleDialog({
  e,
  jahr,
  personen,
  onSchliessen,
}: {
  e: KennzahlenEinstellungen
  jahr: string
  personen: { id: string; name: string }[]
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const speichern = useKzEinstellungenSpeichern()
  const z: JahresZiel = e.ziele[jahr] ?? {}
  const [werte, setWerte] = useState<Record<string, string>>(() => ({
    gesamt: alsText(z.gesamt),
    muri: alsText(z.muri),
    bulle: alsText(z.bulle),
    umsatz: alsText(z.umsatz),
    ...Object.fromEntries(personen.map((p) => [`p:${p.id}`, alsText(z.personen?.[p.id])])),
    ...Object.fromEntries(WAHRSCHEINLICHKEIT.map((w) => [`w:${w}`, String(e.wahrscheinlichkeit[w])])),
    alt_tage: String(e.alt_tage),
    ...Object.fromEntries(RICHTWERTE.map((r) => [`r:${r}`, String(e.richtwerte[r])])),
  }))
  const feld = (schluessel: string, label: string, hinweis?: string) => (
    <Feld key={schluessel} id={`kz-ziel-${schluessel}`} label={label} {...(hinweis ? { hinweis } : {})}>
      <Input
        id={`kz-ziel-${schluessel}`}
        inputMode="decimal"
        value={werte[schluessel] ?? ''}
        onChange={(ev) => {
          setWerte({ ...werte, [schluessel]: ev.target.value })
        }}
      />
    </Feld>
  )
  const betrag = (s: string) => (werte[s]?.trim() ? parseChf(werte[s] ?? '') : null)
  const ganz = (s: string, standard: number) => {
    const n = Number(werte[s]?.replace(',', '.'))
    return Number.isFinite(n) && werte[s]?.trim() ? Math.round(n) : standard
  }

  const sichern = () => {
    const personenZiele = Object.fromEntries(
      personen.map((p) => [p.id, betrag(`p:${p.id}`)]).filter((x): x is [string, number] => x[1] !== null),
    )
    speichern.mutate(
      {
        ziele: {
          [jahr]: {
            gesamt: betrag('gesamt'),
            muri: betrag('muri'),
            bulle: betrag('bulle'),
            umsatz: betrag('umsatz'),
            personen: personenZiele,
          },
        },
        wahrscheinlichkeit: {
          offeriert: ganz('w:offeriert', e.wahrscheinlichkeit.offeriert),
          nachfassen: ganz('w:nachfassen', e.wahrscheinlichkeit.nachfassen),
          vertagt: ganz('w:vertagt', e.wahrscheinlichkeit.vertagt),
          alt: ganz('w:alt', e.wahrscheinlichkeit.alt),
        },
        alt_tage: ganz('alt_tage', e.alt_tage),
        richtwerte: Object.fromEntries(
          RICHTWERTE.map((r) => [r, ganz(`r:${r}`, e.richtwerte[r])]),
        ) as KennzahlenEinstellungen['richtwerte'],
      },
      {
        onSuccess: () => {
          melde('ok', zweisprachig('kz.ziele.gespeichert', { jahr }))
          onSchliessen()
        },
        onError: (f) => {
          const s = fachFehlerSchluessel(f)
          if (s) melde('kritisch', zweisprachig(s))
          else meldeFehler(f, 'kennzahlen')
        },
      },
    )
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        titel={t('kz.ziele.titel', { jahr })}
        beschreibung={t('kz.ziele.beschreibung')}
        fuss={
          <>
            <Button variant="secondary" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button laedt={speichern.isPending} onClick={sichern} data-testid="kz-ziele-speichern">
              {t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-3">
            <h3 className="font-display text-sm font-semibold">{t('kz.ziele.firma')}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {feld('gesamt', t('kz.ziele.gesamt'), t('kz.ziele.gesamtHinweis'))}
              {feld('umsatz', t('kz.ziele.umsatz'), t('kz.ziele.umsatzHinweis'))}
              {feld('muri', t('kz.spalte.muri'))}
              {feld('bulle', t('kz.spalte.bulle'))}
            </div>
          </section>
          <section className="flex flex-col gap-3">
            <h3 className="font-display text-sm font-semibold">{t('kz.ziele.personen')}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {personen.map((p) => feld(`p:${p.id}`, p.name))}
            </div>
          </section>
          <section className="flex flex-col gap-3">
            <h3 className="font-display text-sm font-semibold">{t('kz.ziele.wahrscheinlichkeit')}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {WAHRSCHEINLICHKEIT.map((w) => feld(`w:${w}`, `${t(`kz.pipe.s.${w}`, { tage: e.alt_tage })} (%)`))}
            </div>
            {feld('alt_tage', t('kz.ziele.altTage'))}
          </section>
          <section className="flex flex-col gap-3">
            <h3 className="font-display text-sm font-semibold">{t('kz.ziele.richtwerte')}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {RICHTWERTE.map((r) => feld(`r:${r}`, t(`kz.ziele.r.${r}`)))}
            </div>
          </section>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
