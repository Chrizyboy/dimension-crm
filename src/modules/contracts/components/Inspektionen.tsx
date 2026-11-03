import { CalendarCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { NummerZelle } from '@/components/shared/Zellen'
import { Werkzeugleiste } from '@/components/shared/Werkzeugleiste'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDatum } from '@/lib/format'
import { spaltenHelfer } from '@/lib/tabelle'
import { usePlanPersonen } from '../hooks/useVertraege'
import { wartungTon } from '../lib/anzeige'
import {
  INSPEKTION_FILTER,
  inspektionen,
  inspektionTag,
  inspektionZahlen,
  type InspektionFilter,
} from '../lib/inspektionen'
import { findePaket } from '../lib/tarif'
import type { Katalog, Vertrag } from '../types'
import { TerminDialog } from './TerminDialog'

const spalte = spaltenHelfer<Vertrag>()

/** Uhrzeit HH:MM (Ortszeit). */
const uhr = (iso: string) => new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })

/**
 * Inspektionen planen: fällige (90 Tage) und geplante Inspektionen, sortiert nach Tag. «Termin» setzt Tag, Zeit und
 * Person; die Ankündigung geht 14 Tage vorher über den Ausgangskorb, die Inspektion erscheint am Handy der Person.
 */
export function Inspektionen({
  liste,
  laedt,
  fehler,
  onNochmal,
  katalog,
  onOeffnen,
}: {
  liste: Vertrag[]
  laedt: boolean
  fehler: Error | null
  onNochmal: () => void
  katalog: Katalog | undefined
  onOeffnen: (id: string) => void
}) {
  const { t } = useTranslation()
  const [heute] = useState(() => new Date())
  const [filter, setFilter] = useState<InspektionFilter>('offen')
  const [planen, setPlanen] = useState<Vertrag | null>(null)
  const personen = usePlanPersonen()
  const name = useMemo(() => new Map((personen.data ?? []).map((p) => [p.id, p.name])), [personen.data])
  const zahlen = useMemo(() => inspektionZahlen(liste, heute), [liste, heute])
  const daten = useMemo(() => inspektionen(liste, heute, filter), [liste, heute, filter])

  const spalten = useMemo(
    () =>
      spalte.columns([
        spalte.accessor((v) => inspektionTag(v), {
          id: 'tag',
          header: t('wartung.insp.spalte.tag'),
          cell: (c) => {
            const v = c.row.original
            if (v.termin_von && v.termin_bis) {
              return (
                <span className="flex flex-col text-sm whitespace-nowrap">
                  <span className="font-medium">{formatDatum(c.getValue())}</span>
                  <span className="text-muted-foreground text-xs">{`${uhr(v.termin_von)}–${uhr(v.termin_bis)}`}</span>
                </span>
              )
            }
            return (
              <Badge ton={wartungTon(v.naechste_wartung ?? '', heute)}>
                {t('wartung.insp.faellig', { datum: formatDatum(c.getValue()) })}
              </Badge>
            )
          },
        }),
        spalte.accessor((v) => v.nummer ?? '', {
          id: 'nummer',
          header: t('wartung.spalte.nummer'),
          cell: (c) => <NummerZelle>{c.getValue()}</NummerZelle>,
          meta: { breite: 'w-20', nurBreit: true },
        }),
        spalte.accessor('kunde', {
          header: t('wartung.spalte.kunde'),
          cell: (c) => {
            const v = c.row.original
            const p = findePaket(katalog, v.paket)
            return (
              <span className="flex min-w-0 flex-col">
                <span className="font-medium">{c.getValue()}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {[v.anlage_ort ?? v.ort, p?.name, v.anlage_kwp != null ? `${String(v.anlage_kwp)} kWp` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            )
          },
        }),
        spalte.accessor((v) => (v.termin_person_id ? (name.get(v.termin_person_id) ?? '') : ''), {
          id: 'person',
          header: t('wartung.insp.spalte.person'),
          cell: (c) => c.getValue() || <span className="text-muted-foreground">–</span>,
        }),
        spalte.accessor((v) => v.angekuendigt_am ?? '', {
          id: 'ankuendigung',
          header: t('wartung.insp.spalte.ankuendigung'),
          cell: (c) => {
            const v = c.row.original
            if (!v.termin_von) return <span className="text-muted-foreground">–</span>
            return v.angekuendigt_am ? (
              <Badge ton="ok">{t('wartung.insp.angekuendigt')}</Badge>
            ) : (
              <Badge ton="neutral">{t('wartung.insp.nochNicht')}</Badge>
            )
          },
          meta: { nurBreit: true },
        }),
        spalte.display({
          id: 'aktion',
          header: () => <span className="sr-only">{t('wartung.insp.spalte.aktion')}</span>,
          cell: (c) => (
            <Button
              size="sm"
              variant={c.row.original.termin_von ? 'ghost' : 'secondary'}
              onClick={(e) => {
                e.stopPropagation()
                setPlanen(c.row.original)
              }}
            >
              {c.row.original.termin_von ? t('wartung.insp.aendern') : t('wartung.insp.planen')}
            </Button>
          ),
        }),
      ]),
    [t, katalog, heute, name],
  )

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">{t('wartung.insp.zusammenfassung', zahlen)}</p>
      <Werkzeugleiste>
        <Filterchips
          einzeln
          beschriftung={t('wartung.insp.filter')}
          optionen={INSPEKTION_FILTER.map((f) => ({ wert: f, text: t(`wartung.insp.filterwert.${f}`) }))}
          gewaehlt={[filter]}
          onChange={([f]) => {
            if (f) setFilter(f as InspektionFilter)
          }}
        />
      </Werkzeugleiste>
      {fehler ? (
        <Fehlerzustand details={String(fehler)} onNochmal={onNochmal} />
      ) : (
        <Datentabelle
          daten={daten}
          spalten={spalten}
          laedt={laedt}
          kennung={(v) => v.id}
          onOeffnen={(v) => {
            onOeffnen(v.id)
          }}
          beschriftung={t('wartung.insp.titel')}
          leer={<Leerzustand icon={CalendarCheck} titel={t('wartung.insp.leer')} text={t('wartung.insp.leerText')} />}
        />
      )}
      {planen && (
        <TerminDialog
          vertrag={planen}
          onSchliessen={() => {
            setPlanen(null)
          }}
        />
      )}
    </div>
  )
}
