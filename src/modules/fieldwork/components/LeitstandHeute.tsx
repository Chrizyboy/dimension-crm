import { HardHat } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf, formatDatum } from '@/lib/format'
import { useHeute } from '../hooks/useLeitung'
import { BaustelleHeuteKarte } from './BaustelleHeuteKarte'
import { MeldungZeileAnzeige } from './MeldungZeileAnzeige'

/**
 * «Baustellen heute» für die Projektleitung: wer ist wo, wer hat gestempelt, wie weit ist jede Baustelle, was ist
 * gemeldet und welche Rapporte warten aufs Visum. Lädt alle zwei Minuten neu.
 */
export function LeitstandHeute({
  onBaustelle,
  onRapport,
}: {
  onBaustelle: (projekt: string) => void
  onRapport: (id: string) => void
}) {
  const { t } = useTranslation()
  const heute = useHeute()
  if (heute.error) return <Fehlerzustand details={String(heute.error)} onNochmal={() => void heute.refetch()} />
  if (!heute.data) return <Skelett className="h-96" />
  const { kennzahlen: k, baustellen, meldungen, zu_visieren } = heute.data

  const zahlen: { text: string; wert: string; ton?: 'warnung' | 'kritisch' }[] = [
    { text: t('baustelle.leitung.k.baustellen'), wert: String(k.baustellen) },
    { text: t('baustelle.leitung.k.gestempelt'), wert: `${String(k.gestempelt)}/${String(k.personen)}` },
    { text: t('baustelle.leitung.k.meldungen'), wert: String(k.meldungen), ...(k.meldungen ? { ton: 'warnung' as const } : {}) },
    {
      text: t('baustelle.leitung.k.rapporteFehlen'),
      wert: String(k.rapporte_fehlen),
      ...(k.rapporte_fehlen ? { ton: 'kritisch' as const } : {}),
    },
    { text: t('baustelle.leitung.k.zeitenPruefen'), wert: String(k.zeiten_pruefen) },
    { text: t('baustelle.leitung.k.nachtraege'), wert: formatChf(k.nachtraege_rappen) },
  ]

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {zahlen.map((z) => (
          <Karte key={z.text} className="p-3">
            <dt className="text-muted-foreground text-xs">{z.text}</dt>
            <dd className={`zahlen text-xl font-semibold ${z.ton === 'kritisch' ? 'text-bad' : z.ton === 'warnung' ? 'text-warn' : ''}`}>
              {z.wert}
            </dd>
          </Karte>
        ))}
      </dl>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section aria-label={t('baustelle.leitung.baustellen')} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">
            {t('baustelle.leitung.baustellen')} · {formatDatum(heute.data.tag)}
          </h2>
          {baustellen.length === 0 ? (
            <Leerzustand icon={HardHat} titel={t('baustelle.leitung.leer')} text={t('baustelle.leitung.leerText')} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {baustellen.map((b) => (
                <BaustelleHeuteKarte
                  key={b.einsatz_id}
                  b={b}
                  onOeffnen={() => {
                    onBaustelle(b.projekt_id)
                  }}
                />
              ))}
            </div>
          )}
        </section>
        <div className="flex flex-col gap-4">
          <Karte>
            <KarteKopf>
              <KarteTitel>{t('baustelle.leitung.meldungen')}</KarteTitel>
            </KarteKopf>
            <KarteInhalt className="flex flex-col gap-2">
              {meldungen.length === 0 && <p className="text-muted-foreground text-sm">{t('baustelle.leitung.keineMeldungen')}</p>}
              {meldungen.map((m) => (
                <MeldungZeileAnzeige key={m.id} m={m} />
              ))}
            </KarteInhalt>
          </Karte>
          <Karte>
            <KarteKopf>
              <KarteTitel>{t('baustelle.leitung.visieren')}</KarteTitel>
            </KarteKopf>
            <KarteInhalt className="flex flex-col gap-1">
              {zu_visieren.length === 0 && <p className="text-muted-foreground text-sm">{t('baustelle.leitung.allesVisiert')}</p>}
              {zu_visieren.map((r) => (
                <Button
                  key={r.id}
                  variant="ghost"
                  className="h-auto justify-start py-2 text-left"
                  onClick={() => {
                    onRapport(r.id)
                  }}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">
                      {r.nummer} · {r.kunde ?? '–'}
                    </span>
                    <span className="text-muted-foreground truncate text-xs">
                      {formatDatum(r.datum)} · {t(`baustelle.art.${r.art}`)} · {r.person ?? '–'}
                    </span>
                  </span>
                  {r.rueckfrage && <Badge ton="warnung">{t('baustelle.visum.offen')}</Badge>}
                </Button>
              ))}
            </KarteInhalt>
          </Karte>
        </div>
      </div>
    </div>
  )
}
