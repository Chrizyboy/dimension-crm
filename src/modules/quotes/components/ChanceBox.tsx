import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
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
      <dl className="flex flex-col gap-1.5">
        {offen && (
          <Zeile label={t('offerten.chance.vonHandFeld')}>
            <Inline
              label={t('offerten.chance.vonHandFeld')}
              typ="number"
              wert={o.chanceProzent === null ? '' : String(o.chanceProzent)}
              onSpeichern={(w) => {
                speichere({ chance_prozent: zahl(w) })
              }}
            />
          </Zeile>
        )}
        <Zeile label={t('offerten.chance.erwartet')}>
          <Inline
            label={t('offerten.chance.erwartet')}
            typ="date"
            wert={o.entscheidErwartet ?? ''}
            onSpeichern={(w) => {
              speichere({ entscheid_erwartet: w || null })
            }}
          />
        </Zeile>
        <Zeile label={t('offerten.chance.gueltig')}>
          <Inline
            label={t('offerten.chance.gueltig')}
            typ="date"
            wert={o.gueltigBis ?? ''}
            onSpeichern={(w) => {
              speichere({ gueltig_bis: w || null })
            }}
          />
        </Zeile>
        <Zeile label={t('offerten.chance.konkurrenz')}>
          <Inline
            label={t('offerten.chance.konkurrenz')}
            wert={o.konkurrenz ?? ''}
            onSpeichern={(w) => {
              speichere({ konkurrenz: w || null })
            }}
          />
        </Zeile>
        <Zeile label={t('offerten.chance.rabatt')}>
          <Inline
            label={t('offerten.chance.rabatt')}
            typ="number"
            wert={o.rabattProzent === null ? '' : String(o.rabattProzent)}
            onSpeichern={(w) => {
              speichere({ rabatt_prozent: zahl(w) })
            }}
          />
        </Zeile>
      </dl>
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
