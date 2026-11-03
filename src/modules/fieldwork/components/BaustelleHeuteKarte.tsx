import { AlertTriangle, Camera, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte } from '@/components/ui/karte'
import { zuerich } from '../lib/zeit'
import type { BaustelleHeute } from '../types'
import { sollTon } from '../lib/auswertung'
import { Balken } from './Balken'

/** Eine Baustelle auf «Baustellen heute»: Team mit Stempel-Stand, Fortschritt, Soll/Ist, Fotos, Meldungen. */
export function BaustelleHeuteKarte({ b, onOeffnen }: { b: BaustelleHeute; onOeffnen: () => void }) {
  const { t } = useTranslation()
  const ton = sollTon(b.ist, b.soll)
  return (
    <Karte className="flex flex-col gap-3 p-4">
      <button type="button" className="flex items-start justify-between gap-3 text-left" onClick={onOeffnen}>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{b.kunde ?? '–'}</span>
          <span className="text-muted-foreground block truncate text-sm">
            {b.nummer} · {b.ort ?? '–'}
          </span>
        </span>
        <Badge ton="marke">{t(`baustelle.vorlage.${b.vorlage}`, b.vorlage)}</Badge>
      </button>
      <ul className="flex flex-wrap gap-1.5" aria-label={t('baustelle.tag.team')}>
        {b.team.map((p) => (
          <li key={p.id}>
            <Badge ton={p.laeuft ? 'ok' : p.seit ? 'neutral' : 'warnung'} punkt>
              {p.kuerzel ?? p.name}
              {p.seit ? ` ${zuerich(p.seit).zeit}` : ` ${t('baustelle.leitung.nichtGestempelt')}`}
            </Badge>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 text-sm">
        <Balken wert={b.fortschritt} beschriftung={t('baustelle.tag.fortschritt')} />
        <span className="zahlen text-muted-foreground w-10 shrink-0 text-right text-xs">{b.fortschritt}%</span>
      </div>
      <dl className="text-muted-foreground grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="flex items-center gap-1">
            <Clock className="size-3" aria-hidden="true" />
            {t('baustelle.leitung.sollIst')}
          </dt>
          <dd
            className={`zahlen text-sm ${ton === 'bad' ? 'text-bad' : ton === 'warn' ? 'text-warn' : 'text-foreground'}`}
          >
            {b.ist ?? 0} / {b.soll ?? '–'} h
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1">
            <Camera className="size-3" aria-hidden="true" />
            {t('baustelle.leitung.fotos')}
          </dt>
          <dd className="zahlen text-foreground text-sm">
            {b.fotos_heute} {t('baustelle.leitung.heute')} · {b.fotos}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1">
            <AlertTriangle className="size-3" aria-hidden="true" />
            {t('baustelle.leitung.meldungen')}
          </dt>
          <dd className="zahlen text-foreground text-sm">{b.meldungen.length}</dd>
        </div>
      </dl>
      {(b.rapport_gestern_fehlt || b.meldungen.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {b.rapport_gestern_fehlt && <Badge ton="kritisch">{t('baustelle.leitung.gesternFehlt')}</Badge>}
          {b.meldungen.map((m) => (
            <Badge key={m.id} ton="warnung">
              {m.nummer} {t(`baustelle.meldung.arten.${m.art}`)}
            </Badge>
          ))}
        </div>
      )}
    </Karte>
  )
}
