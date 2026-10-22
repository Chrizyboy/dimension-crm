import { Plus, Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { spaltenHelfer } from '@/lib/tabelle'
import { useLieferanten } from '../hooks/useEinkauf'
import type { Lieferant } from '../types'
import { LieferantDialog } from './LieferantDialog'

const spalte = spaltenHelfer<Lieferant>()

/** Lieferanten mit Bestell-Adresse, Kundennummer und Sprache der Bestellung. Ohne Adresse kein Mailversand. */
export function Lieferanten() {
  const { t } = useTranslation()
  const liste = useLieferanten()
  const [offen, setOffen] = useState<Lieferant | 'neu' | null>(null)
  const spalten = useMemo(
    () =>
      spalte.columns([
        spalte.accessor('name', {
          header: t('einkauf.lieferant.name'),
          cell: (c) => <span className="font-medium">{c.getValue()}</span>,
        }),
        spalte.accessor((l) => l.email_bestellung ?? '', {
          id: 'mail',
          header: t('einkauf.lieferant.mail'),
          cell: (c) => c.getValue() || <Badge ton="warnung">{t('einkauf.lieferant.ohneMail')}</Badge>,
        }),
        spalte.accessor((l) => l.kundennummer_bei_lieferant ?? '', {
          id: 'kundennummer',
          header: t('einkauf.lieferant.kundennummer'),
          meta: { nurBreit: true },
        }),
        spalte.accessor('sprache', {
          header: t('einkauf.lieferant.sprache'),
          cell: (c) => t(`wartung.sprache.${c.getValue()}`),
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
          daten={liste.data ?? []}
          spalten={spalten}
          laedt={liste.isPending}
          kennung={(l) => l.id}
          onOeffnen={setOffen}
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
