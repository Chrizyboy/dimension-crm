import { useTranslation } from 'react-i18next'
import { formatChf } from '@/lib/format'
import { cn } from '@/lib/utils'
import { datumOderLeer, terminText } from '../lib/anzeige'
import type { AkteZahlen } from '../lib/kennzahlen'

/** Eine Zahl der Leiste: Beschriftung oben, Wert darunter, wahlweise als Warnung gefärbt. */
function Zahl({ label, wert, warnung = false }: { label: string; wert: string; warnung?: boolean }) {
  return (
    <div className="bg-surface flex min-w-0 flex-col gap-0.5 px-3 py-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={cn('zahlen truncate text-base font-semibold', warnung && 'text-warn')}>{wert || '–'}</span>
    </div>
  )
}

/**
 * Die Kundenakte auf einen Blick: seit wann, wie viel, was offen ist, welche Anlagen und was als Nächstes ansteht.
 * Gerechnet in `akteZahlen` aus denselben Zeilen wie die Boxen darunter.
 */
export function AkteZahlenLeiste({ z }: { z: AkteZahlen }) {
  const { t } = useTranslation()
  const termin = z.naechsterTermin
  return (
    <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-3 xl:grid-cols-6">
      <Zahl label={t('kundenseite.zahl.seit')} wert={datumOderLeer(z.kundeSeit)} />
      <Zahl
        label={t('kundenseite.zahl.auftraege')}
        wert={z.auftraegeRappen ? formatChf(z.auftraegeRappen, { mitWaehrung: true }) : ''}
      />
      <Zahl
        label={
          z.ueberfaellig
            ? t('kundenseite.zahl.offenUeberfaellig', { count: z.ueberfaellig })
            : t('kundenseite.zahl.offen')
        }
        wert={z.offenRappen ? formatChf(z.offenRappen, { mitWaehrung: true }) : ''}
        warnung={z.offenRappen > 0}
      />
      <Zahl label={t('kundenseite.zahl.anlagen')} wert={z.kwp ? `${String(z.kwp)} kWp` : ''} />
      <Zahl
        label={t('kundenseite.zahl.service')}
        wert={
          z.serviceOffen
            ? t('kundenseite.zahl.serviceOffen', { count: z.serviceOffen })
            : t('kundenseite.zahl.keinService')
        }
        warnung={z.serviceOffen > 0}
      />
      <Zahl
        label={termin ? t(`kundenseite.termin.${termin.art}`) : t('kundenseite.zahl.termin')}
        wert={termin ? (termin.datum.length > 10 ? terminText(termin.datum) : datumOderLeer(termin.datum)) : ''}
      />
    </div>
  )
}
