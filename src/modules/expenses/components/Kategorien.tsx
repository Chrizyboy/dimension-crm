import { NurAdministration } from '@/components/shared/NurAdministration'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import {
  finanzEinstellungenSpeichern,
  useFinanzEinstellungen,
  type SpesenKategorie,
} from '@/hooks/useFinanzEinstellungen'
import { formatChf, parseChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { Umschalter } from './Umschalter'

/** Zeile im Formular: Beträge als Text, wie sie im Feld stehen. */
interface Zeile extends SpesenKategorie {
  richtwert: string
  belegAb: string
}

const zuZeile = (k: SpesenKategorie): Zeile => ({
  ...k,
  richtwert: k.richtwert_rappen ? formatChf(k.richtwert_rappen) : '',
  belegAb: k.beleg_ab_rappen ? formatChf(k.beleg_ab_rappen) : '',
})

/**
 * Spesen-Regeln (nur mit Recht «finanzen»): Mail der Buchhaltung, Kilometer-Ansatz, Frist, Standard der
 * Auszahlung und die Kategorien (V233 «Kategorien anpassbar») mit Konto, üblicher MWST, Richtwert und
 * Belegpflicht. Gespeichert wird der Schlüssel; eine umbenannte Kategorie behält ihn, alte Spesen ihren Text.
 */
export function Kategorien() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const einstellungen = useFinanzEinstellungen()
  const { laeuft, aus } = useAktion()
  const [liste, setListe] = useState<Zeile[]>(einstellungen.spesen_kategorien.map(zuZeile))
  const [mail, setMail] = useState(einstellungen.buchhaltung_email ?? '')
  const [kmSatz, setKmSatz] = useState(formatChf(einstellungen.spesen.km_satz_rappen))
  const [tage, setTage] = useState(String(einstellungen.spesen.einreichen_tage))
  const [auszahlung, setAuszahlung] = useState(einstellungen.spesen.auszahlung)

  const aendern = (i: number, x: Partial<Zeile>) => {
    setListe((l) => l.map((k, j) => (j === i ? { ...k, ...x } : k)))
  }

  async function speichern() {
    const sauber: SpesenKategorie[] = liste
      .map((k) => ({ ...k, de: k.de.trim(), fr: k.fr.trim() || k.de.trim() }))
      .filter((k) => k.de)
      .map(({ richtwert, belegAb, ...k }) => ({
        ...k,
        schluessel: k.schluessel || k.de,
        art: k.art ?? 'beleg',
        konto: k.konto?.trim() || null,
        richtwert_rappen: parseChf(richtwert) ?? null,
        richtwert_je: parseChf(richtwert) ? (k.richtwert_je ?? 'person') : null,
        beleg_ab_rappen: parseChf(belegAb) ?? 0,
      }))
    await aus(
      async () => {
        await finanzEinstellungenSpeichern({
          ...einstellungen,
          spesen_kategorien: sauber,
          buchhaltung_email: mail.trim() || null,
          spesen: {
            km_satz_rappen: parseChf(kmSatz) ?? einstellungen.spesen.km_satz_rappen,
            einreichen_tage: Number(tage) || einstellungen.spesen.einreichen_tage,
            auszahlung,
          },
        })
        await qc.invalidateQueries({ queryKey: ['einstellungen', 'finanzen'] })
        await qc.invalidateQueries({ queryKey: ['spesen'] })
      },
      { de: 'Gespeichert', fr: 'Enregistré' },
    )
  }

  return (
    <NurAdministration>
      <div className="flex flex-col">
        <AkteAbschnitt ebene={2} titel={t('spesen.regeln.titel')}>
          <div className="grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feld
              id="spesen-buchhaltung-mail"
              label={t('spesen.kategorien.mail')}
              hinweis={t('spesen.kategorien.mailHinweis')}
            >
              <Input
                id="spesen-buchhaltung-mail"
                type="email"
                value={mail}
                onChange={(e) => {
                  setMail(e.target.value)
                }}
              />
            </Feld>
            <Feld id="spesen-km-satz" label={t('spesen.regeln.kmSatz')} hinweis={t('spesen.regeln.kmSatzHinweis')}>
              <Input
                id="spesen-km-satz"
                inputMode="decimal"
                value={kmSatz}
                onChange={(e) => {
                  setKmSatz(e.target.value)
                }}
              />
            </Feld>
            <Feld id="spesen-tage" label={t('spesen.regeln.tage')} hinweis={t('spesen.regeln.tageHinweis')}>
              <Input
                id="spesen-tage"
                inputMode="numeric"
                value={tage}
                onChange={(e) => {
                  setTage(e.target.value.replace(/\D/g, ''))
                }}
              />
            </Feld>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium">{t('spesen.regeln.auszahlung')}</span>
              <Umschalter
                beschriftung={t('spesen.regeln.auszahlung')}
                wert={auszahlung}
                optionen={[
                  { wert: 'lohn', text: t('spesen.auszahlen.lohn') },
                  { wert: 'ueberweisung', text: t('spesen.auszahlen.ueberweisung') },
                ]}
                onChange={setAuszahlung}
              />
            </div>
          </div>
        </AkteAbschnitt>
        <AkteAbschnitt ebene={2} titel={t('spesen.kategorien.titel')} zusatz={String(liste.length)}>
          <ul className="flex flex-col gap-3">
            {liste.map((k, i) => (
              <li
                key={`${k.schluessel}-${String(i)}`}
                className="bg-surface grid gap-2 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_6rem_7rem_8rem_8rem_auto]"
              >
                <Input
                  aria-label={t('spesen.kategorien.de')}
                  placeholder={t('spesen.kategorien.de')}
                  value={k.de}
                  onChange={(e) => {
                    aendern(i, { de: e.target.value })
                  }}
                />
                <Input
                  aria-label={t('spesen.kategorien.fr')}
                  placeholder={t('spesen.kategorien.fr')}
                  value={k.fr}
                  onChange={(e) => {
                    aendern(i, { fr: e.target.value })
                  }}
                />
                <Input
                  aria-label={t('spesen.konto')}
                  placeholder={t('spesen.konto')}
                  value={k.konto ?? ''}
                  onChange={(e) => {
                    aendern(i, { konto: e.target.value })
                  }}
                />
                {k.art === 'kilometer' ? (
                  <span className="text-muted-foreground self-center text-xs lg:col-span-3">
                    {t('spesen.regeln.kmKategorie')}
                  </span>
                ) : (
                  <>
                    <Auswahl
                      aria-label={t('spesen.erfassen.mwst')}
                      value={k.mwst_satz === null || k.mwst_satz === undefined ? '' : String(k.mwst_satz)}
                      onValueChange={(v) => {
                        aendern(i, { mwst_satz: Number(v) })
                      }}
                      platzhalter={t('spesen.erfassen.mwst')}
                      optionen={['8.1', '3.8', '2.6', '0'].map((m) => ({ wert: m, text: `${m} %` }))}
                    />
                    <Input
                      aria-label={t('spesen.regeln.richtwert')}
                      placeholder={t('spesen.regeln.richtwert')}
                      inputMode="decimal"
                      value={k.richtwert}
                      onChange={(e) => {
                        aendern(i, { richtwert: e.target.value })
                      }}
                    />
                    <Input
                      aria-label={t('spesen.regeln.belegAb')}
                      placeholder={t('spesen.regeln.belegAb')}
                      inputMode="decimal"
                      value={k.belegAb}
                      onChange={(e) => {
                        aendern(i, { belegAb: e.target.value })
                      }}
                    />
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('spesen.kategorien.entfernen')}
                  onClick={() => {
                    setListe((l) => l.filter((_, j) => j !== i))
                  }}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap justify-between gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setListe((l) => [
                  ...l,
                  zuZeile({ schluessel: '', de: '', fr: '', art: 'beleg', mwst_satz: 8.1, beleg_ab_rappen: 0 }),
                ])
              }}
            >
              <Plus />
              {t('spesen.kategorien.neu')}
            </Button>
            <Button laedt={laeuft} onClick={() => void speichern()}>
              {t('allgemein.speichern')}
            </Button>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">{t('spesen.kategorien.hinweis')}</p>
        </AkteAbschnitt>
      </div>
    </NurAdministration>
  )
}
