import { Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { finanzEinstellungenSpeichern, useFinanzEinstellungen } from '@/hooks/useFinanzEinstellungen'
import { formatChf, parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { useFirmen } from '../hooks/useRechnungen'
import { ibanAnzeige, ibanPruefen } from '../lib/qr'
import { firmaSpeichern } from '../services/rechnungen'
import type { Firma } from '../types'

const FELDER = ['name', 'strasse', 'plz', 'ort', 'mwst_nr', 'uid_nr', 'iban', 'bank', 'telefon', 'email'] as const
type Werte = Record<(typeof FELDER)[number], string> & { zahlungsfrist_tage: string }

/** Angaben einer Firma (Standort) für Rechnung und QR-Zahlteil (V233 «Rechnungseinstellungen»). */
function FirmaKarte({ firma }: { firma: Firma }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [w, setW] = useState<Werte>(() => ({
    ...(Object.fromEntries(FELDER.map((f) => [f, firma[f] ?? ''])) as Record<(typeof FELDER)[number], string>),
    iban: firma.iban ? ibanAnzeige(firma.iban) : '',
    zahlungsfrist_tage: String(firma.zahlungsfrist_tage),
  }))
  const iban = w.iban.trim() ? ibanPruefen(w.iban) : 'ok'
  const frist = Number(w.zahlungsfrist_tage)
  const gueltig = iban === 'ok' && Number.isInteger(frist) && frist >= 0 && frist <= 120 && !!w.name.trim()

  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{firma.name}</KarteTitel>
      </KarteKopf>
      <KarteInhalt className="grid gap-3 sm:grid-cols-2">
        {FELDER.map((f) => (
          <Feld
            key={f}
            id={`firma-${firma.kuerzel}-${f}`}
            label={t(`rechnungen.firma.${f}`)}
            {...(f === 'iban' && iban !== 'ok' ? { fehler: t(`rechnungen.firma.iban_${iban}`) } : {})}
            {...(f === 'iban' && iban === 'ok' ? { hinweis: t('rechnungen.firma.ibanHinweis') } : {})}
          >
            <Input
              id={`firma-${firma.kuerzel}-${f}`}
              value={w[f]}
              onChange={(e) => {
                setW({ ...w, [f]: e.target.value })
              }}
            />
          </Feld>
        ))}
        <Feld id={`firma-${firma.kuerzel}-frist`} label={t('rechnungen.firma.zahlungsfrist')}>
          <Input
            id={`firma-${firma.kuerzel}-frist`}
            inputMode="numeric"
            className="w-24"
            value={w.zahlungsfrist_tage}
            onChange={(e) => {
              setW({ ...w, zahlungsfrist_tage: e.target.value })
            }}
          />
        </Feld>
        <div className="flex items-end justify-end sm:col-span-2">
          <Button
            laedt={laeuft}
            disabled={!gueltig}
            onClick={() =>
              void aus(
                () =>
                  firmaSpeichern(firma.id, {
                    ...Object.fromEntries(FELDER.map((f) => [f, w[f].trim() || null])),
                    name: w.name.trim(),
                    iban: w.iban.trim() ? w.iban.replace(/\s+/g, '').toUpperCase() : null,
                    zahlungsfrist_tage: frist,
                  }),
                { de: 'Firmenangaben gespeichert', fr: 'Données de la société enregistrées' },
              )
            }
          >
            <Save />
            {t('allgemein.speichern')}
          </Button>
        </div>
      </KarteInhalt>
    </Karte>
  )
}

/** Mahnfrist und Stundensatz für Service-Rechnungen (Einstellung «finanzen»). */
function RechnungsEinstellungen() {
  const { t } = useTranslation()
  const e = useFinanzEinstellungen()
  const { laeuft, aus } = useAktion()
  const [frist, setFrist] = useState(String(e.mahnfrist_tage))
  const [satz, setSatz] = useState(formatChf(e.service_stundensatz_rappen))
  const rappen = parseChf(satz)
  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('rechnungen.einstellungen.titel')}</KarteTitel>
      </KarteKopf>
      <KarteInhalt className="grid gap-3 sm:grid-cols-2">
        <Feld
          id="einst-mahnfrist"
          label={t('rechnungen.einstellungen.mahnfrist')}
          hinweis={t('rechnungen.einstellungen.mahnfristHinweis')}
        >
          <Input
            id="einst-mahnfrist"
            inputMode="numeric"
            className="w-24"
            value={frist}
            onChange={(x) => {
              setFrist(x.target.value)
            }}
          />
        </Feld>
        <Feld
          id="einst-stundensatz"
          label={t('rechnungen.einstellungen.stundensatz')}
          hinweis={t('rechnungen.einstellungen.stundensatzHinweis')}
        >
          <Input
            id="einst-stundensatz"
            inputMode="decimal"
            className="w-32"
            value={satz}
            onChange={(x) => {
              setSatz(x.target.value)
            }}
          />
        </Feld>
        <div className="flex justify-end sm:col-span-2">
          <Button
            laedt={laeuft}
            disabled={!rappen || !(Number(frist) >= 1)}
            onClick={() =>
              void aus(
                () =>
                  finanzEinstellungenSpeichern({
                    ...e,
                    mahnfrist_tage: Number(frist),
                    service_stundensatz_rappen: rappen ?? e.service_stundensatz_rappen,
                  }),
                {
                  de: 'Gespeichert',
                  fr: 'Enregistré',
                },
              )
            }
          >
            <Save />
            {t('allgemein.speichern')}
          </Button>
        </div>
      </KarteInhalt>
    </Karte>
  )
}

/** Reiter «Firmen»: Angaben je Firma (Muri GmbH, Bulle Sàrl) und Einstellungen der Rechnungen. */
export function Firmen() {
  const firmen = useFirmen()
  const e = useFinanzEinstellungen()
  if (firmen.error) return <Fehlerzustand details={String(firmen.error)} onNochmal={() => void firmen.refetch()} />
  if (!firmen.data) return <Skelett className="h-64" />
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {firmen.data.map((f) => (
        <FirmaKarte key={`${f.id}${f.iban ?? ''}${f.name}`} firma={f} />
      ))}
      <RechnungsEinstellungen key={`${String(e.mahnfrist_tage)}-${String(e.service_stundensatz_rappen)}`} />
    </div>
  )
}
