import { ShieldCheck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { hatRecht } from '@/lib/rechte'
import { formatChf, formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel } from '@/services/fachfehler'
import { useAnmeldung } from '@/stores/anmeldung'
import { useOffertAenderung, useOffertEinstellungen } from '../hooks/useOfferten'
import { gibFrei, setzeAngaben } from '../services/ablauf'
import type { Offerte } from '../types'
import { Box, Zeile } from './Box'

type Angaben = Parameters<typeof setzeAngaben>[1]

/** Feld, das beim Verlassen speichert (nur bei Änderung). */
function Inline({
  label,
  wert,
  typ = 'text',
  onSpeichern,
}: {
  label: string
  wert: string
  typ?: 'text' | 'date' | 'number'
  onSpeichern: (w: string) => void
}) {
  return (
    <Input
      aria-label={label}
      type={typ}
      className="h-8"
      defaultValue={wert}
      key={wert}
      onBlur={(e) => {
        if (e.target.value.trim() !== wert) onSpeichern(e.target.value.trim())
      }}
    />
  )
}

/**
 * Chance und Prognose (automatisch, von Hand überschreibbar), erwarteter Entscheid, gültig bis, Konkurrenz und
 * Rabatt; darunter die Freigabe vor dem Senden, wenn Rabatt oder Marge es verlangen.
 */
export function ChanceBox({ o }: { o: Offerte }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const cfg = useOffertEinstellungen().data
  const [fehler, setFehler] = useState<string | null>(null)
  const setzen = useOffertAenderung((a: Angaben) => setzeAngaben(o.id, a))
  const freigeben = useOffertAenderung(() => gibFrei(o.id))
  const speichere = (a: Angaben) => {
    setzen.mutate(a, {
      onError: (f) => {
        meldeFehler(f, 'offerten.angaben')
      },
    })
  }
  const zahl = (w: string) => (w === '' ? null : Number(w.replace(',', '.')))
  const offen = o.status !== 'angenommen' && o.status !== 'verloren'
  const darfFreigeben = !!ich && (hatRecht(ich, 'admin') || (cfg?.freigabe.durch ?? []).includes(ich.kuerzel))
  /** Angaben der Offerte: gefüllte stehen da, leere erst nach «+ weitere Angaben» (Entscheid 0058). */
  const feld = (
    key: string,
    label: string,
    wert: string,
    typ: 'text' | 'date' | 'number',
    onSpeichern: (w: string) => void,
  ): ReactNode => (
    <Zeile key={key} label={label} leer={wert === ''}>
      <Inline label={label} typ={typ} wert={wert} onSpeichern={onSpeichern} />
    </Zeile>
  )
  const felder = [
    ...(offen
      ? [
          feld(
            'chance',
            t('offerten.chance.vonHandFeld'),
            o.chanceProzent === null ? '' : String(o.chanceProzent),
            'number',
            (w) => {
              speichere({ chance_prozent: zahl(w) })
            },
          ),
        ]
      : []),
    feld('erwartet', t('offerten.chance.erwartet'), o.entscheidErwartet ?? '', 'date', (w) => {
      speichere({ entscheid_erwartet: w || null })
    }),
    feld('gueltig', t('offerten.chance.gueltig'), o.gueltigBis ?? '', 'date', (w) => {
      speichere({ gueltig_bis: w || null })
    }),
    feld('konkurrenz', t('offerten.chance.konkurrenz'), o.konkurrenz ?? '', 'text', (w) => {
      speichere({ konkurrenz: w || null })
    }),
    feld(
      'rabatt',
      t('offerten.chance.rabatt'),
      o.rabattProzent === null ? '' : String(o.rabattProzent),
      'number',
      (w) => {
        speichere({ rabatt_prozent: zahl(w) })
      },
    ),
  ]
  return (
    <Box titel={t('offerten.chance.titel')}>
      {offen && (
        <>
          <div className="flex items-center justify-between gap-2">
            <span>{t('offerten.chance.chance')}</span>
            <span className="zahlen text-lg font-semibold">{o.chance} %</span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden="true">
            <div className="bg-warn h-full" style={{ width: `${o.chance}%` }} />
          </div>
          <p className="text-muted-foreground text-xs">
            {o.chanceProzent === null ? t('offerten.chance.auto') : t('offerten.chance.vonHand')}
            {o.betragRappen
              ? ` · ${t('offerten.chance.gewichtet', { betrag: formatChf((o.betragRappen * o.chance) / 100, { mitWaehrung: true }) })}`
              : ''}
          </p>
        </>
      )}
      <dl className="flex flex-col gap-1.5">{felder}</dl>
      {o.freigabe ? (
        <p className="text-ok flex items-center gap-1.5 text-xs">
          <ShieldCheck className="size-4" aria-hidden="true" />
          {t('offerten.freigabe.erteilt', {
            name: o.freigabe.name ?? '',
            datum: o.freigabe.am ? formatDatum(o.freigabe.am.slice(0, 10)) : '',
          })}
        </p>
      ) : (
        o.freigabeGrund && (
          <div className="border-warn bg-warn-soft flex flex-col gap-1.5 rounded-lg border p-2 text-xs">
            <p>
              {t(`offerten.freigabe.noetig_${o.freigabeGrund}`)} ·{' '}
              {t('offerten.freigabe.text', {
                rabatt: cfg?.freigabe.rabattAb ?? 5,
                marge: cfg?.freigabe.margeUnter ?? 18,
              })}
            </p>
            {darfFreigeben && (
              <Button
                size="sm"
                className="self-start"
                laedt={freigeben.isPending}
                onClick={() => {
                  setFehler(null)
                  freigeben.mutate(undefined, {
                    onError: (f) => {
                      const s = fachFehlerSchluessel(f)
                      if (!s) meldeFehler(f, 'offerten.freigabe')
                      setFehler(t(s ?? 'fachfehler.allgemein'))
                    },
                  })
                }}
              >
                <ShieldCheck />
                {t('offerten.freigabe.knopf')}
              </Button>
            )}
            {fehler && (
              <p role="alert" className="text-bad">
                {fehler}
              </p>
            )}
          </div>
        )
      )}
    </Box>
  )
}
