import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { formatChf, formatDatum, parseChf } from '@/lib/format'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { heuteZuerich } from '../lib/datum'
import { kontostandRappen, saldo } from '../lib/vorschau'
import { einstellungenSpeichern } from '../services/finanzen'
import type { Finanzdaten } from '../types'

/**
 * Bank (V233): Kontostand eintragen (Basis der Vorschau, mit Verlauf) und die Einstellungen der Vorschau:
 * Anzahl Wochen, Vorlauf für Material vor dem Bautermin, Reserve als Warnschwelle.
 */
export function Bank({ daten }: { daten: Finanzdaten }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const { laeuft, aus } = useAktion()
  const e = daten.einstellungen
  const s = saldo(daten)
  const [betrag, setBetrag] = useState('')
  const [datum, setDatum] = useState(heuteZuerich())
  const [konto, setKonto] = useState(e.saldo?.konto ?? '')
  const [wochen, setWochen] = useState(String(e.wochen ?? 12))
  const [vorlauf, setVorlauf] = useState(String(e.vorlauf ?? 5))
  const [reserve, setReserve] = useState(e.reserve_rappen ? formatChf(e.reserve_rappen) : '')

  const eintragen = () => {
    const rappen = parseChf(betrag)
    if (rappen === null) return
    const neu = { betrag_rappen: rappen, datum, konto: konto.trim(), at: new Date().toISOString(), by: ich?.name ?? '' }
    void aus(
      async () => {
        await einstellungenSpeichern(e, { saldo: neu, saldoHist: [neu, ...(e.saldoHist ?? [])].slice(0, 50) })
        setBetrag('')
      },
      { de: 'Kontostand eingetragen', fr: 'Solde enregistré' },
    )
  }
  const einstellungen = () =>
    void aus(
      () =>
        einstellungenSpeichern(e, {
          wochen: Math.max(4, Math.min(26, Number(wochen) || 12)),
          vorlauf: Math.max(0, Number(vorlauf) || 0),
          reserve_rappen: parseChf(reserve) ?? 0,
        }),
      { de: 'Gespeichert', fr: 'Enregistré' },
    )

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <AkteAbschnitt ebene={2} titel={t('finanzen.bank.kontostand')}>
        <p className="text-sm">
          {s.bekannt
            ? t('finanzen.bank.aktuell', {
                betrag: formatChf(s.rappen, { mitWaehrung: true }),
                basis: formatChf(s.basis, { mitWaehrung: true }),
                datum: s.seit ? formatDatum(s.seit) : '',
                count: s.buchungen,
              })
            : t('finanzen.warnung.saldo')}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Feld id="bank-betrag" label={t('finanzen.betrag')} pflicht>
            <Input
              id="bank-betrag"
              inputMode="decimal"
              value={betrag}
              onChange={(x) => {
                setBetrag(x.target.value)
              }}
            />
          </Feld>
          <Feld id="bank-datum" label={t('finanzen.bank.datum')} pflicht>
            <Input
              id="bank-datum"
              type="date"
              value={datum}
              onChange={(x) => {
                setDatum(x.target.value)
              }}
            />
          </Feld>
          <Feld id="bank-konto" label={t('finanzen.bank.konto')}>
            <Input
              id="bank-konto"
              value={konto}
              onChange={(x) => {
                setKonto(x.target.value)
              }}
            />
          </Feld>
        </div>
        <Button className="mt-3" laedt={laeuft} disabled={parseChf(betrag) === null || !datum} onClick={eintragen}>
          {t('finanzen.bank.eintragen')}
        </Button>
        {(e.saldoHist ?? []).length > 0 && (
          <ul className="mt-4 divide-y text-sm">
            {(e.saldoHist ?? []).slice(0, 10).map((k) => (
              <li key={`${k.datum}-${k.at ?? ''}`} className="flex justify-between gap-2 py-1.5">
                <span>
                  {formatDatum(k.datum)}
                  <span className="text-muted-foreground ml-2 text-xs">
                    {[k.konto, k.by].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="zahlen">{formatChf(kontostandRappen(k))}</span>
              </li>
            ))}
          </ul>
        )}
      </AkteAbschnitt>
      <AkteAbschnitt ebene={2} titel={t('finanzen.bank.einstellungen')}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Feld id="bank-wochen" label={t('finanzen.bank.wochen')} hinweis="4–26">
            <Input
              id="bank-wochen"
              inputMode="numeric"
              value={wochen}
              onChange={(x) => {
                setWochen(x.target.value)
              }}
            />
          </Feld>
          <Feld id="bank-vorlauf" label={t('finanzen.bank.vorlauf')} hinweis={t('finanzen.bank.vorlaufHinweis')}>
            <Input
              id="bank-vorlauf"
              inputMode="numeric"
              value={vorlauf}
              onChange={(x) => {
                setVorlauf(x.target.value)
              }}
            />
          </Feld>
          <Feld id="bank-reserve" label={t('finanzen.bank.reserve')} hinweis={t('finanzen.bank.reserveHinweis')}>
            <Input
              id="bank-reserve"
              inputMode="decimal"
              value={reserve}
              onChange={(x) => {
                setReserve(x.target.value)
              }}
            />
          </Feld>
        </div>
        <Button className="mt-3" variant="secondary" laedt={laeuft} onClick={einstellungen}>
          {t('allgemein.speichern')}
        </Button>
        <p className="text-muted-foreground mt-3 text-xs">{t('finanzen.bank.hinweis')}</p>
      </AkteAbschnitt>
    </div>
  )
}
