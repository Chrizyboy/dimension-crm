import { CircleCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useBelegung, useFahrzeuge, useFristen, useGeraete, useNamen, useSchaeden } from '../hooks/useRessourcen'
import { plusTage } from '../lib/belegung'
import { zuErledigen, type Aufgabe } from '../lib/erledigen'
import { heuteZuerich } from '../lib/fristen'
import { Box } from './Box'
import { HeuteUnterwegs } from './HeuteUnterwegs'

const PUNKT = { kritisch: 'bg-bad', warnung: 'bg-warn', info: 'bg-info' } as const

/**
 * «Zu erledigen»: alles, was im Bereich ansteht, an einem Ort, damit niemand fünf Listen durchsehen muss.
 * Oben die Zahlen, links die Liste (Kritisches zuerst), rechts wer heute mit welchem Fahrzeug wo ist.
 */
export function Erledigen({ onOeffnen }: { onOeffnen: (z: { fahrzeug?: string; geraet?: string }) => void }) {
  const { t } = useTranslation()
  const heute = heuteZuerich()
  const fahrzeuge = useFahrzeuge()
  const geraete = useGeraete()
  const fristen = useFristen()
  const schaeden = useSchaeden()
  const belegung = useBelegung(heute, plusTage(heute, 13))
  const namen = useNamen()
  const abfragen = [fahrzeuge, geraete, fristen, schaeden, belegung]
  const fehler = abfragen.find((a) => a.error)?.error
  if (fehler)
    return (
      <Fehlerzustand
        details={String(fehler)}
        onNochmal={() => {
          for (const a of abfragen) void a.refetch()
        }}
      />
    )
  if (abfragen.some((a) => !a.data)) return <Skelett className="h-80" />
  const liste = zuErledigen({
    fahrzeuge: fahrzeuge.data ?? [],
    geraete: geraete.data ?? [],
    fristen: fristen.data ?? [],
    schaeden: schaeden.data ?? [],
    belegung: belegung.data ?? [],
    heute,
  })
  const zahl = (p: (a: Aufgabe) => boolean) => liste.filter(p).length
  const zahlen = [
    { id: 'ueberfaellig', wert: zahl((a) => a.art === 'frist' && a.ton === 'kritisch'), ton: 'text-bad' },
    { id: 'bald', wert: zahl((a) => a.art === 'frist' && a.ton === 'warnung'), ton: 'text-warn' },
    { id: 'schaeden', wert: zahl((a) => a.art === 'schaden'), ton: 'text-bad' },
    { id: 'konflikte', wert: zahl((a) => a.art === 'konflikt'), ton: 'text-warn' },
  ]

  const text = (a: Aufgabe) => {
    const g = a.angaben
    const p = typeof g.person === 'string' && g.person.length === 36 ? namen.person(g.person) : (g.person ?? '')
    return {
      titel: t(`fuhrpark.erledigen.titel.${a.art === 'frist' ? String(g.frist) : a.art}`, { name: a.titel }),
      zeile: t(`fuhrpark.erledigen.zeile.${a.art === 'frist' && Number(g.tage) < 0 ? 'frist_vorbei' : a.art}`, {
        datum: g.datum ? formatDatum(String(g.datum)) : '',
        count: Math.abs(Number(g.tage ?? g.rest ?? 0)),
        tage: Number(g.tage ?? 0),
        bei: Number(g.bei ?? 0).toLocaleString('de-CH'),
        stand: g.stand ? t(`fuhrpark.schaden.stand.${String(g.stand)}`) : '',
        text: g.text ?? '',
        person: p,
      }),
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {zahlen.map((z) => (
          <div key={z.id} className="bg-surface flex flex-col gap-0.5 rounded-lg border px-3 py-2">
            <span className={cn('zahlen text-2xl font-semibold', z.wert > 0 && z.ton)}>{z.wert}</span>
            <span className="text-muted-foreground text-xs">{t(`fuhrpark.erledigen.zahl.${z.id}`)}</span>
          </div>
        ))}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Box titel={t('fuhrpark.erledigen.liste')} rechts={liste.length}>
          {liste.length === 0 ? (
            <Leerzustand
              icon={CircleCheck}
              titel={t('fuhrpark.erledigen.leer')}
              text={t('fuhrpark.erledigen.leerText')}
            />
          ) : (
            <ul className="divide-border flex flex-col divide-y">
              {liste.map((a) => {
                const x = text(a)
                return (
                  <li key={a.schluessel} className="flex items-center gap-3 py-2.5">
                    <span className={cn('size-2 shrink-0 rounded-full', PUNKT[a.ton])} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{x.titel}</p>
                      <p className="text-muted-foreground text-xs">{x.zeile}</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        onOeffnen(a.fahrzeug_id ? { fahrzeug: a.fahrzeug_id } : { geraet: a.geraet_id ?? '' })
                      }}
                    >
                      {t('fuhrpark.erledigen.oeffnen')}
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </Box>
        <HeuteUnterwegs
          fahrzeuge={fahrzeuge.data ?? []}
          belegung={belegung.data ?? []}
          heute={heute}
          onOeffnen={(id) => {
            onOeffnen({ fahrzeug: id })
          }}
        />
      </div>
    </div>
  )
}
