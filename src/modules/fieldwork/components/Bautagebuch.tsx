import { Camera, HardHat, Stamp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { formatDatum } from '@/lib/format'
import type { TagebuchRapport } from '../types'

/** Bautagebuch: jeder Rapport der Baustelle als Tag mit Arbeiten, Team-Stunden, Fotos, Check und Visum. */
export function Bautagebuch({ rapporte, onRapport }: { rapporte: TagebuchRapport[]; onRapport: (id: string) => void }) {
  const { t } = useTranslation()
  if (rapporte.length === 0) return <p className="text-muted-foreground text-sm">{t('baustelle.akte.keineRapporte')}</p>
  return (
    <ol className="flex flex-col">
      {rapporte.map((r) => (
        <li key={r.id} className="border-border border-l-2 pb-3 pl-3">
          <button
            type="button"
            className="hover:bg-muted -ml-1 flex w-full flex-col gap-1 rounded-md p-1 text-left text-sm"
            onClick={() => {
              onRapport(r.id)
            }}
          >
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium">{formatDatum(r.datum)}</span>
              <span className="text-muted-foreground">
                {r.nummer} · {t(`baustelle.art.${r.art}`)} · {r.person ?? '–'}
              </span>
              {!r.abgeschlossen_am && <Badge ton="warnung">{t('baustelle.rapport.offen')}</Badge>}
              {r.montage_fertig && <Badge ton="ok">{t('baustelle.rapport.montageFertig')}</Badge>}
              {r.rueckfrage && !r.visiert_am && <Badge ton="warnung">{t('baustelle.visum.offen')}</Badge>}
            </span>
            {r.arbeiten && <span className="line-clamp-2">{r.arbeiten}</span>}
            <span className="text-muted-foreground flex flex-wrap gap-3 text-xs">
              {r.stunden != null && <span className="zahlen">{r.stunden} h</span>}
              <span className="inline-flex items-center gap-1">
                <Camera className="size-3" aria-hidden="true" />
                {r.fotos_anzahl}
              </span>
              {r.sicherheit && (
                <span className="text-ok inline-flex items-center gap-1">
                  <HardHat className="size-3" aria-hidden="true" />
                  {t('baustelle.akte.check')}
                </span>
              )}
              {r.visiert_am && (
                <span className="text-ok inline-flex items-center gap-1">
                  <Stamp className="size-3" aria-hidden="true" />
                  {t('baustelle.visum.kurz')}
                </span>
              )}
              {r.vorbehalte.length > 0 && (
                <span className="text-warn">{t('baustelle.akte.vorbehalte', { count: r.vorbehalte.length })}</span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}
