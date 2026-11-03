import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { reiterKnopfKlasse, reiterListeKlasse } from '@/components/ui/reiter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatChf } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAussendienst, useVerkaufEinstellung } from '../hooks/useVerkauf'
import { VERKAUF_STANDARD } from '../lib/einstellung'
import { heuteIso } from '../lib/geschaeft'
import { steuerung, type SteuerZeile } from '../lib/steuerung'
import type { Geschaeft } from '../types'

const ZEITRAEUME = [30, 90, 365] as const

const prozent = (teil: number, ganz: number) => (ganz ? `${String(Math.round((teil / ganz) * 100))} %` : '–')

/** Tempo als «12 Min.» oder «3 Std.»; Arbeitsminuten, nicht Uhrzeit. */
function tempo(min: number | null, t: TFunction) {
  if (min === null) return '–'
  return min < 120 ? t('verkauf.steuerung.min', { n: min }) : t('verkauf.steuerung.std', { n: Math.round(min / 60) })
}

function Tafel({ titel, zeilen, name }: { titel: string; zeilen: SteuerZeile[]; name: (k: string) => string }) {
  const { t } = useTranslation()
  const frist = (useVerkaufEinstellung().data ?? VERKAUF_STANDARD).erstkontakt_minuten
  return (
    <Karte className="min-w-0">
      <KarteKopf className="min-h-10 py-1.5">
        <KarteTitel>{titel}</KarteTitel>
      </KarteKopf>
      <Tabelle aria-label={titel}>
        <TabelleKopf>
          <Zeile>
            <Kopfzelle />
            <Kopfzelle zahl>{t('verkauf.steuerung.leads')}</Kopfzelle>
            <Kopfzelle zahl>{t('verkauf.steuerung.tempo')}</Kopfzelle>
            <Kopfzelle zahl>{t('verkauf.steuerung.imTempo', { n: frist })}</Kopfzelle>
            <Kopfzelle zahl>{t('verkauf.steuerung.termin')}</Kopfzelle>
            <Kopfzelle zahl>{t('verkauf.steuerung.offerte')}</Kopfzelle>
            <Kopfzelle zahl>{t('verkauf.steuerung.gewonnen')}</Kopfzelle>
            <Kopfzelle zahl>{t('verkauf.steuerung.wert')}</Kopfzelle>
          </Zeile>
        </TabelleKopf>
        <TabelleKoerper>
          {zeilen.map((z) => (
            <Zeile key={z.schluessel}>
              <Zelle className="font-medium">{name(z.schluessel)}</Zelle>
              <Zelle zahl>{z.leads}</Zelle>
              <Zelle zahl className={cn(z.erstkontaktMinuten !== null && z.erstkontaktMinuten > frist && 'text-warn')}>
                {tempo(z.erstkontaktMinuten, t)}
              </Zelle>
              <Zelle zahl>{z.imTempo === null ? '–' : prozent(z.imTempo, 1)}</Zelle>
              <Zelle zahl>{prozent(z.termin, z.leads)}</Zelle>
              <Zelle zahl>{prozent(z.offerte, z.leads)}</Zelle>
              <Zelle zahl>
                {z.gewonnen} ({prozent(z.gewonnen, z.leads)})
              </Zelle>
              <Zelle zahl>{z.gewonnenRappen ? formatChf(z.gewonnenRappen) : '–'}</Zelle>
            </Zeile>
          ))}
        </TabelleKoerper>
      </Tabelle>
    </Karte>
  )
}

/**
 * Verkaufssteuerung für die Geschäftsleitung: wie schnell wird angerufen, wie viele Leads kommen bis zum
 * Termin, zur Offerte und zum Auftrag, je Verkäufer und je Quelle, und warum verlieren wir. Gezählt werden
 * Leads mit Eingang im gewählten Zeitraum; Kosten pro Lead stehen in den Kennzahlen.
 */
export default function Steuerung({ geschaefte }: { geschaefte: Geschaeft[] }) {
  const { t } = useTranslation()
  const [tage, setTage] = useState<(typeof ZEITRAEUME)[number]>(90)
  const einstellung = useVerkaufEinstellung().data ?? VERKAUF_STANDARD
  const personen = useAussendienst()
  const quellen = useAuswahl('quelle')
  const s = useMemo(() => {
    const bis = heuteIso()
    const von = new Date(Date.parse(bis) - tage * 86_400_000).toISOString().slice(0, 10)
    return steuerung(geschaefte, von, bis, einstellung)
  }, [geschaefte, tage, einstellung])
  const personName = (id: string) =>
    personen.data?.find((p) => p.id === id)?.name ?? (id ? id.slice(0, 6) : t('verkauf.steuerung.ohnePerson'))
  const maxGrund = Math.max(1, ...s.verlustgruende.map((v) => v.anzahl))

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label={t('verkauf.steuerung.zeitraum')} className={cn(reiterListeKlasse, 'self-start')}>
        {ZEITRAEUME.map((z) => (
          <button
            key={z}
            type="button"
            aria-current={z === tage ? 'page' : undefined}
            onClick={() => {
              setTage(z)
            }}
            className={reiterKnopfKlasse}
          >
            {t('verkauf.steuerung.tage', { n: z })}
          </button>
        ))}
      </nav>
      <Tafel titel={t('verkauf.steuerung.gesamt')} zeilen={[s.gesamt]} name={() => t('verkauf.steuerung.alle')} />
      <Tafel titel={t('verkauf.steuerung.proPerson')} zeilen={s.proPerson} name={personName} />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Tafel
          titel={t('verkauf.steuerung.proQuelle')}
          zeilen={s.proQuelle}
          name={(q) => (q ? quellen.text(q) : t('verkauf.steuerung.ohneQuelle'))}
        />
        <Karte className="min-w-0">
          <KarteKopf className="min-h-10 py-1.5">
            <KarteTitel>{t('verkauf.steuerung.verlust')}</KarteTitel>
          </KarteKopf>
          {s.verlustgruende.length === 0 ? (
            <p className="text-muted-foreground p-3 text-sm">{t('verkauf.steuerung.keinVerlust')}</p>
          ) : (
            <ul className="flex flex-col gap-2 p-3 text-sm">
              {s.verlustgruende.map((v) => (
                <li key={v.grund} className="flex flex-col gap-1">
                  <span className="flex justify-between gap-2">
                    <span className="min-w-0 truncate">{v.grund}</span>
                    <span className="zahlen text-muted-foreground font-mono">{v.anzahl}</span>
                  </span>
                  <span className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden="true">
                    <span
                      className="bg-reihe-1 block h-full"
                      style={{ width: `${String((v.anzahl / maxGrund) * 100)}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Karte>
      </div>
    </div>
  )
}
