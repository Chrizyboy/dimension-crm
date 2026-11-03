import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { useUi } from '@/stores/ui'
import type { EinstellungsInhaltProps } from '@/types/einstellungen'
import { useBenutzerDaten } from '../hooks/useBenutzer'
import type { Rolle } from '../types'
import { RollenDialog } from './RollenDialog'

/** Einstellungen › Rollen: Rechte und sichtbare Bereiche je Rolle, mit Anzahl aktiver Personen. */
export default function Rollen({ module }: EinstellungsInhaltProps) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const { personen, rollen } = useBenutzerDaten()
  const [rolle, setRolle] = useState<Rolle | null>(null)
  const liste = personen.data ?? []
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(rollen.data ?? []).map((r) => {
        const anzahl = liste.filter((p) => p.rolle === r.schluessel && p.aktiv).length
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              setRolle(r)
            }}
            className="bg-surface hover:border-border-strong focus-visible:ring-ring flex flex-col gap-2 rounded-lg border p-4 text-left outline-none focus-visible:ring-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-medium">
                <ShieldCheck className="text-muted-foreground size-4" aria-hidden="true" />
                {sprache === 'fr' ? r.name_fr : r.name_de}
              </span>
              <span className="text-muted-foreground text-xs">{t('rollen.personen', { count: anzahl })}</span>
            </div>
            <p className="text-muted-foreground text-sm">{sprache === 'fr' ? r.beschreibung_fr : r.beschreibung_de}</p>
            <div className="flex flex-wrap gap-1">
              {r.rechte.map((x) => (
                <Badge key={x} ton="marke">
                  {t(`rechte.${x}`)}
                </Badge>
              ))}
              <Badge>
                {r.bereiche.length === 0
                  ? t('rollen.alleBereiche')
                  : t('rollen.bereiche', { count: r.bereiche.length })}
              </Badge>
            </div>
          </button>
        )
      })}
      <RollenDialog
        key={rolle?.id ?? 'keine-rolle'}
        rolle={rolle}
        onSchliessen={() => {
          setRolle(null)
        }}
        module={module}
      />
    </div>
  )
}
