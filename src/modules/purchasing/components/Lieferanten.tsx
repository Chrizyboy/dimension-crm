import { Plus, Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { spaltenHelfer } from '@/lib/tabelle'
import { formatChf } from '@/lib/format'
import { useLieferantKennzahlen, useLieferanten } from '../hooks/useEinkauf'
import type { Lieferant, LieferantKennzahl } from '../types'
import { LieferantDialog } from './LieferantDialog'

type Zeile = Lieferant & { kz: LieferantKennzahl | undefined }
const spalte = spaltenHelfer<Zeile>()

/**
 * Lieferanten mit Bestell-Adresse, Konditionen und Kennzahlen (Einkauf im Jahr, Termintreue, Lieferzeit, offene
 * Bestellungen). Ohne Adresse kein Mailversand.
 */
export function Lieferanten() {
  const { t } = useTranslation()
  const liste = useLieferanten()
  const kennzahlen = useLieferantKennzahlen()
  const daten = useMemo(
    () => (liste.data ?? []).map((l) => ({ ...l, kz: kennzahlen.data?.get(l.id) })),
    [liste.data, kennzahlen.data],
  )
  const [offen, setOffen] = useState<Lieferant | 'neu' | null>(null)
  const spalten = useMemo(
    () =>
      spalte.columns([
        spalte.accessor('name', {
          header: t('einkauf.lieferant.name'),
          // Am Handy steht die Bestell-Adresse unter dem Namen, damit beide Spalten nicht gequetscht werden.
          cell: (c) => (
            <span className="flex flex-col">
              <span className="font-medium">{c.getValue()}</span>
              <span className="text-muted-foreground text-xs break-all md:hidden">
                {c.row.original.email_bestellung ?? t('einkauf.lieferant.ohneMail')}
              </span>
            </span>
          ),
        }),
        spalte.accessor((l) => l.email_bestellung ?? '', {
          id: 'mail',
          header: t('einkauf.lieferant.mail'),
          cell: (c) => c.getValue() || <Badge ton="warnung">{t('einkauf.lieferant.ohneMail')}</Badge>,
          meta: { nurBreit: true },
        }),
        spalte.accessor((l) => l.kz?.einkauf_jahr_rappen ?? 0, {
          id: 'einkauf',
          header: t('einkauf.lieferant.einkaufJahr'),
          cell: (c) => <span className="zahlen">{formatChf(c.getValue())}</span>,
        }),
        spalte.accessor((l) => l.kz?.puenktlich_prozent ?? -1, {
          id: 'puenktlich',
          header: t('einkauf.lieferant.puenktlich'),
          cell: (c) => {
            const p = c.row.original.kz?.puenktlich_prozent
            if (p == null) return <span className="text-muted-foreground">–</span>
            return <Badge ton={p >= 90 ? 'ok' : p >= 75 ? 'warnung' : 'kritisch'}>{p} %</Badge>
          },
          meta: { nurBreit: true },
        }),
        spalte.accessor((l) => l.kz?.lieferzeit_schnitt_tage ?? l.lieferzeit_tage ?? -1, {
          id: 'lieferzeit',
          header: t('einkauf.lieferant.lieferzeit'),
          cell: (c) => (c.getValue() < 0 ? '–' : t('einkauf.lieferant.tage', { n: c.getValue() })),
          meta: { nurBreit: true },
        }),
        spalte.accessor((l) => l.fracht_frei_ab_rappen ?? -1, {
          id: 'fracht',
          header: t('einkauf.lieferant.frachtFrei'),
          cell: (c) => (c.getValue() < 0 ? '–' : <span className="zahlen">{formatChf(c.getValue())}</span>),
          meta: { nurBreit: true },
        }),
        spalte.accessor((l) => l.kz?.offen ?? 0, {
          id: 'offen',
          header: t('einkauf.lieferant.offen'),
          cell: (c) => <span className="zahlen">{c.getValue()}</span>,
          meta: { nurBreit: true },
        }),
        spalte.accessor('aktiv', {
          header: t('einkauf.lieferant.stand'),
          cell: (c) =>
            c.getValue() ? (
              <Badge ton="ok" punkt>
                {t('einkauf.lieferant.aktiv')}
              </Badge>
            ) : (
              <Badge ton="neutral">{t('einkauf.lieferant.inaktiv')}</Badge>
            ),
        }),
      ]),
    [t],
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setOffen('neu')
          }}
        >
          <Plus />
          {t('einkauf.lieferant.neu')}
        </Button>
      </div>
      {liste.error ? (
        <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
      ) : (
        <Datentabelle
          daten={daten}
          spalten={spalten}
          laedt={liste.isPending}
          kennung={(l) => l.id}
          onOeffnen={(z) => {
            setOffen(z)
          }}
          beschriftung={t('einkauf.reiter.lieferanten')}
          leer={<Leerzustand icon={Truck} titel={t('einkauf.lieferant.leer')} />}
        />
      )}
      {offen && (
        <LieferantDialog
          lieferant={offen === 'neu' ? null : offen}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
    </div>
  )
}
