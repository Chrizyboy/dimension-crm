import { SunMedium } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Skelett } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { useAnlagen } from '../hooks/useService'
import { faellig, tageBis } from '../lib/anzeige'
import type { Anlage } from '../types'
import { AnlageDialog } from './AnlageDialog'

type Ansicht = 'alle' | 'kontrolle' | 'garantie'

/**
 * Anlagen (V233 «Anlage-Daten»): je gebaute Anlage IBN, Garantie, nächste Kontrolle, Komponenten und
 * Monitoring. «Kontrolle fällig» zeigt, was in den nächsten 30 Tagen ansteht.
 */
export function AnlagenListe() {
  const { t } = useTranslation()
  const liste = useAnlagen()
  const komponente = useAuswahl('komponente')
  const [ansicht, setAnsicht] = useState<Ansicht>('alle')
  const [suche, setSuche] = useState('')
  const [heute] = useState(() => new Date())
  const [offen, setOffen] = useState<Anlage | null>(null)

  const passt = useMemo(
    () => ({
      alle: () => true,
      kontrolle: (a: Anlage) => faellig(a.naechste_kontrolle, heute),
      garantie: (a: Anlage) => (tageBis(a.garantie_bis, heute) ?? -1) >= 0,
    }),
    [heute],
  )
  const daten = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return (liste.data ?? [])
      .filter(passt[ansicht])
      .filter((a) => !s || `${a.kunde} ${a.adresse} ${a.projekt ?? ''}`.toLowerCase().includes(s))
  }, [liste.data, ansicht, suche, passt])

  if (liste.error) return <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
  if (liste.isPending) return <Skelett className="h-96" />

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          einzeln
          beschriftung={t('service.anlagen.ansicht')}
          optionen={(['alle', 'kontrolle', 'garantie'] as const).map((a) => ({
            wert: a,
            text: t(`service.anlagen.${a}`),
            anzahl: liste.data.filter(passt[a]).length,
          }))}
          gewaehlt={[ansicht]}
          onChange={([a]) => {
            setAnsicht((a ?? 'alle') as Ansicht)
          }}
        />
        <Input
          type="search"
          className="w-full sm:w-64"
          aria-label={t('service.suche')}
          placeholder={t('service.suche')}
          value={suche}
          onChange={(e) => {
            setSuche(e.target.value)
          }}
        />
      </div>
      {daten.length === 0 ? (
        <Leerzustand icon={SunMedium} titel={t('service.anlagen.leer')} text={t('service.anlagen.leerText')} />
      ) : (
        <div className="bg-surface overflow-x-auto rounded-xl border">
          <Tabelle aria-label={t('service.reiter.anlagen')}>
            <TabelleKopf>
              <tr>
                <Kopfzelle>{t('service.feld.kunde')}</Kopfzelle>
                <Kopfzelle className="hidden md:table-cell">{t('service.anlagen.komponenten')}</Kopfzelle>
                <Kopfzelle>{t('service.anlagen.ibn')}</Kopfzelle>
                <Kopfzelle className="hidden md:table-cell">{t('service.anlagen.garantie')}</Kopfzelle>
                <Kopfzelle>{t('service.anlagen.kontrolle')}</Kopfzelle>
              </tr>
            </TabelleKopf>
            <TabelleKoerper>
              {daten.slice(0, 300).map((a) => (
                <Zeile
                  key={a.id}
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={() => {
                    setOffen(a)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setOffen(a)
                  }}
                >
                  <Zelle>
                    <span className="flex max-w-[18rem] min-w-0 flex-col">
                      <span className="truncate font-medium">{a.kunde}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {[a.adresse, a.leistung_kwp ? `${String(a.leistung_kwp)} kWp` : null, a.projekt]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </Zelle>
                  <Zelle className="hidden md:table-cell">
                    <span className="flex flex-wrap gap-1">
                      {[...new Set(a.komponenten.map((k) => k.art))].map((k) => (
                        <Badge key={k}>{komponente.text(k)}</Badge>
                      ))}
                    </span>
                  </Zelle>
                  <Zelle>{a.ibn_am ? formatDatum(a.ibn_am) : '–'}</Zelle>
                  <Zelle className="hidden md:table-cell">{a.garantie_bis ? formatDatum(a.garantie_bis) : '–'}</Zelle>
                  <Zelle>
                    {a.naechste_kontrolle ? (
                      <Badge ton={faellig(a.naechste_kontrolle, heute) ? 'warnung' : 'neutral'}>
                        {formatDatum(a.naechste_kontrolle)}
                      </Badge>
                    ) : (
                      '–'
                    )}
                  </Zelle>
                </Zeile>
              ))}
            </TabelleKoerper>
          </Tabelle>
        </div>
      )}
      {offen && (
        <AnlageDialog
          anlage={offen}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
    </div>
  )
}
