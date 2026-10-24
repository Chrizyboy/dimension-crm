import { FileCheck2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Skelett } from '@/components/ui/diverses'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { formatDatum } from '@/lib/format'
import { useUi } from '@/stores/ui'
import { useBewilligungen, useProjekte } from '../hooks/useProjekte'
import { brauchtBewilligung, nachDringlichkeit, schrittDatum, schrittTon } from '../lib/fahrplan'
import type { FahrplanSchritt } from '../types'
import { SchrittDialog } from './SchrittDialog'

const STATUS = ['auftrag', 'im_bau'] as const
type Ansicht = 'offen' | 'spaet' | 'bald'

/**
 * Bewilligungen & Netzanschluss (V48) als Tabelle: je Projekt eine Zeile, je Schritt eine Spalte
 * (Baugesuch/Meldung, Netzanschluss, IA, SiNa, Abnahme, Pronovo) mit Stand, Datum und Frist.
 * Überfällige zuerst. Klick auf eine Zelle öffnet den Schritt.
 */
export function Bewilligungen({ onOeffnen }: { onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const projekte = useProjekte([...STATUS])
  const schritte = useBewilligungen()
  const [ansicht, setAnsicht] = useState<Ansicht>('offen')
  const [heute] = useState(() => new Date())
  const [offen, setOffen] = useState<{ s: FahrplanSchritt; titel: string } | null>(null)

  const { spalten, zeilen, zahl } = useMemo(() => {
    const nachProjekt = new Map<string, FahrplanSchritt[]>()
    for (const s of schritte.data ?? []) nachProjekt.set(s.projekt_id, [...(nachProjekt.get(s.projekt_id) ?? []), s])
    const erste = [...nachProjekt.values()][0] ?? []
    const alle = (projekte.data ?? [])
      .filter((p) => brauchtBewilligung(p, nachProjekt.get(p.id) ?? [], heute))
      .sort(nachDringlichkeit)
    const passt: Record<Ansicht, (l: FahrplanSchritt[]) => boolean> = {
      offen: () => true,
      spaet: (l) => l.some((s) => s.ueberfaellig),
      bald: (l) => l.some((s) => s.bald),
    }
    return {
      spalten: erste.map((s) => ({ schluessel: s.schluessel, name: sprache === 'fr' ? s.name_fr : s.name_de })),
      zeilen: alle.map((p) => ({ p, l: nachProjekt.get(p.id) ?? [] })).filter((z) => passt[ansicht](z.l)),
      zahl: (a: Ansicht) => alle.filter((p) => passt[a](nachProjekt.get(p.id) ?? [])).length,
    }
  }, [projekte.data, schritte.data, heute, ansicht, sprache])

  if (projekte.error || schritte.error) {
    return (
      <Fehlerzustand details={String(projekte.error ?? schritte.error)} onNochmal={() => void schritte.refetch()} />
    )
  }
  if (projekte.isPending || schritte.isPending) return <Skelett className="h-96" />

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          einzeln
          beschriftung={t('projekte.bewilligungen.ansicht')}
          optionen={(['offen', 'spaet', 'bald'] as const).map((a) => ({
            wert: a,
            text: t(`projekte.bewilligungen.${a}`),
            anzahl: zahl(a),
          }))}
          gewaehlt={[ansicht]}
          onChange={([a]) => {
            setAnsicht((a ?? 'offen') as Ansicht)
          }}
        />
        <p className="text-muted-foreground text-xs">{t('projekte.bewilligungen.hilfe')}</p>
      </div>
      {zeilen.length === 0 ? (
        <Leerzustand icon={FileCheck2} titel={t('projekte.bewilligungen.leer')} />
      ) : (
        <div className="bg-surface overflow-x-auto rounded-xl border">
          <Tabelle aria-label={t('projekte.reiter.bewilligungen')}>
            <TabelleKopf>
              <tr>
                <Kopfzelle>{t('projekte.spalte.projekt')}</Kopfzelle>
                {spalten.map((s) => (
                  <Kopfzelle key={s.schluessel}>{s.name}</Kopfzelle>
                ))}
              </tr>
            </TabelleKopf>
            <TabelleKoerper>
              {zeilen.map(({ p, l }) => (
                <Zeile key={p.id}>
                  <Zelle>
                    <button
                      type="button"
                      className="focus-visible:ring-ring flex max-w-[16rem] min-w-0 flex-col rounded text-left outline-none focus-visible:ring-2"
                      onClick={() => {
                        onOeffnen(p.id)
                      }}
                    >
                      <span className="truncate font-medium">{p.kunde}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        <span className="zahlen font-mono">{p.nummer}</span> · {p.ort ?? '–'} ·{' '}
                        {t(`projekte.status.${p.status}`)}
                      </span>
                    </button>
                  </Zelle>
                  {spalten.map((sp) => {
                    const s = l.find((x) => x.schluessel === sp.schluessel)
                    if (!s) return <Zelle key={sp.schluessel}>–</Zelle>
                    const datum = schrittDatum(s)
                    return (
                      <Zelle key={sp.schluessel}>
                        <button
                          type="button"
                          aria-label={`${sp.name}: ${t(`projekte.stand.${s.stand}`)}`}
                          className="focus-visible:ring-ring flex flex-col items-start gap-0.5 rounded text-left outline-none focus-visible:ring-2"
                          onClick={() => {
                            setOffen({ s, titel: `${p.nummer} · ${p.kunde}` })
                          }}
                        >
                          <Badge ton={schrittTon(s)} punkt>
                            {t(`projekte.stand.${s.stand}`)}
                          </Badge>
                          <span className="text-muted-foreground zahlen flex flex-col text-xs">
                            {datum && <span>{formatDatum(datum)}</span>}
                            {s.frist && s.stand !== 'erledigt' && s.stand !== 'nicht_noetig' && (
                              <span className={s.ueberfaellig ? 'text-bad font-medium' : s.bald ? 'text-warn' : ''}>
                                {t('projekte.fahrplan.bis', { datum: formatDatum(s.frist) })}
                              </span>
                            )}
                          </span>
                        </button>
                      </Zelle>
                    )
                  })}
                </Zeile>
              ))}
            </TabelleKoerper>
          </Tabelle>
        </div>
      )}
      {offen && (
        <SchrittDialog
          schritt={offen.s}
          titel={offen.titel}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
    </div>
  )
}
