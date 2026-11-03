import { BarChart3 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { formatChf, formatDatum } from '@/lib/format'
import { useAuswertung } from '../hooks/useLeitung'
import { abweichung, auswertungZahlen, stundenProKwp } from '../lib/auswertung'
import { heute, plusTage } from '../lib/zeit'
import { MELDUNG_ARTEN } from '../types'

const ZEITRAEUME = { monat: 30, quartal: 91, jahr: 365 } as const
type Zeitraum = keyof typeof ZEITRAEUME

/**
 * Auswertung für die GL: fertige Baustellen mit Soll/Ist und Stunden pro kWp, Reiseanteil, Nachträge,
 * Meldungen nach Art und wie zuverlässig rapportiert wird (am gleichen Tag, visiert). Nur mit Recht `preise`.
 */
export function AuswertungAnsicht({ onBaustelle }: { onBaustelle: (projekt: string) => void }) {
  const { t } = useTranslation()
  const [zeitraum, setZeitraum] = useState<Zeitraum>('quartal')
  const bis = heute()
  const daten = useAuswertung(plusTage(bis, -ZEITRAEUME[zeitraum]), bis)
  const a = daten.data
  const z = a ? auswertungZahlen(a) : null
  const prozent = (x: number | null, plus = false) => (x == null ? '–' : `${plus && x > 0 ? '+' : ''}${String(x)}%`)

  const kacheln =
    z && a
      ? [
          { text: t('baustelle.auswertung.fertig'), wert: String(z.fertig) },
          { text: t('baustelle.auswertung.abweichung'), wert: prozent(z.abweichung, true) },
          { text: t('baustelle.auswertung.hProKwp'), wert: z.hProKwp == null ? '–' : `${String(z.hProKwp)} h` },
          { text: t('baustelle.auswertung.reise'), wert: prozent(z.reiseAnteil) },
          { text: t('baustelle.auswertung.nachtraege'), wert: formatChf(a.nachtraege.rappen) },
          { text: t('baustelle.auswertung.gleicherTag'), wert: prozent(z.gleicherTag) },
        ]
      : []

  return (
    <div className="flex flex-col gap-4">
      <Filterchips
        einzeln
        beschriftung={t('baustelle.auswertung.zeitraum')}
        optionen={(Object.keys(ZEITRAEUME) as Zeitraum[]).map((k) => ({
          wert: k,
          text: t(`baustelle.auswertung.${k}`),
        }))}
        gewaehlt={[zeitraum]}
        onChange={(w) => {
          if (w[0]) setZeitraum(w[0] as Zeitraum)
        }}
      />
      {daten.error ? (
        <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
      ) : !a ? (
        <Skelett className="h-96" />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {kacheln.map((k) => (
              <Karte key={k.text} className="p-3">
                <dt className="text-muted-foreground text-xs">{k.text}</dt>
                <dd className="zahlen text-xl font-semibold">{k.wert}</dd>
              </Karte>
            ))}
          </dl>
          <div className="grid gap-4 lg:grid-cols-[3fr_1fr]">
            <Karte>
              <KarteKopf>
                <KarteTitel>{t('baustelle.auswertung.baustellen')}</KarteTitel>
              </KarteKopf>
              <KarteInhalt>
                {a.fertig.length === 0 ? (
                  <Leerzustand
                    icon={BarChart3}
                    titel={t('baustelle.auswertung.leer')}
                    text={t('baustelle.auswertung.leerText')}
                  />
                ) : (
                  <Tabelle aria-label={t('baustelle.auswertung.baustellen')}>
                    <TabelleKopf>
                      <Zeile>
                        <Kopfzelle>{t('baustelle.spalte.nummer')}</Kopfzelle>
                        <Kopfzelle>{t('baustelle.spalte.kunde')}</Kopfzelle>
                        <Kopfzelle>{t('baustelle.spalte.datum')}</Kopfzelle>
                        <Kopfzelle className="text-right">kWp</Kopfzelle>
                        <Kopfzelle className="text-right">{t('baustelle.leitung.sollIst')}</Kopfzelle>
                        <Kopfzelle className="text-right">{t('baustelle.auswertung.abw')}</Kopfzelle>
                        <Kopfzelle className="text-right">h/kWp</Kopfzelle>
                      </Zeile>
                    </TabelleKopf>
                    <TabelleKoerper>
                      {a.fertig.map((b) => {
                        const abw = abweichung(b)
                        return (
                          <Zeile
                            key={b.projekt_id}
                            className="cursor-pointer"
                            onClick={() => {
                              onBaustelle(b.projekt_id)
                            }}
                          >
                            <Zelle className="zahlen">{b.nummer}</Zelle>
                            <Zelle>{[b.kunde, b.ort].filter(Boolean).join(', ') || '–'}</Zelle>
                            <Zelle>{formatDatum(b.datum)}</Zelle>
                            <Zelle className="zahlen text-right">{b.kwp ?? '–'}</Zelle>
                            <Zelle className="zahlen text-right">
                              {b.ist ?? '–'} / {b.soll ?? '–'}
                            </Zelle>
                            <Zelle
                              className={`zahlen text-right ${abw != null && abw > 15 ? 'text-bad' : abw != null && abw > 0 ? 'text-warn' : 'text-ok'}`}
                            >
                              {prozent(abw, true)}
                            </Zelle>
                            <Zelle className="zahlen text-right">{stundenProKwp(b) ?? '–'}</Zelle>
                          </Zeile>
                        )
                      })}
                    </TabelleKoerper>
                  </Tabelle>
                )}
              </KarteInhalt>
            </Karte>
            <Karte>
              <KarteKopf>
                <KarteTitel>{t('baustelle.leitung.meldungen')}</KarteTitel>
              </KarteKopf>
              <KarteInhalt>
                <dl className="flex flex-col gap-1 text-sm">
                  {MELDUNG_ARTEN.map((m) => (
                    <div key={m} className="flex justify-between">
                      <dt>{t(`baustelle.meldung.arten.${m}`)}</dt>
                      <dd className="zahlen">{a.meldungen[m] ?? 0}</dd>
                    </div>
                  ))}
                  <div className="border-border mt-2 flex justify-between border-t pt-2">
                    <dt>{t('baustelle.auswertung.visiert')}</dt>
                    <dd className="zahlen">{prozent(z?.visiert ?? null)}</dd>
                  </div>
                </dl>
              </KarteInhalt>
            </Karte>
          </div>
        </>
      )}
    </div>
  )
}
