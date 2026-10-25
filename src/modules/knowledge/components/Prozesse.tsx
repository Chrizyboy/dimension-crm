import { FileText, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { useUi } from '@/stores/ui'
import { useHandbuch } from '../hooks/useHandbuch'
import { passt, sortiere } from '../lib/handbuch'
import type { HandbuchEintrag } from '../types'
import { ProzessDialog } from './ProzessDialog'
import { ProzessZeile } from './ProzessZeile'

/**
 * Prozesse (V233 Helpdesk › Prozesse): unsere Abläufe als PDF, immer die aktuelle Version, ein Klick öffnet.
 * Die Administration legt neue an, lädt neue Versionen hoch (alte bleiben unter «Frühere Versionen») oder entfernt sie.
 */
export function Prozesse({ admin }: { admin: boolean }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const daten = useHandbuch()
  const [suche, setSuche] = useState('')
  const [dialog, setDialog] = useState<HandbuchEintrag | 'neu' | null>(null)
  const alle = useMemo(() => (daten.data ?? []).filter((e) => e.art === 'prozess'), [daten.data])
  const liste = useMemo(
    () =>
      sortiere(
        alle.filter((e) => passt(e, suche)),
        sprache,
      ),
    [alle, suche, sprache],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-muted-foreground max-w-prose text-sm">{t('handbuch.prozesse.intro')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label={t('handbuch.prozesse.suche')}
              placeholder={t('handbuch.prozesse.suche')}
              className="w-64 pl-8"
              value={suche}
              onChange={(e) => {
                setSuche(e.target.value)
              }}
            />
          </div>
          {admin && (
            <Button
              onClick={() => {
                setDialog('neu')
              }}
            >
              <Plus />
              {t('handbuch.prozesse.neu')}
            </Button>
          )}
        </div>
      </div>
      {daten.error ? (
        <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
      ) : !daten.data ? (
        <Skelett className="h-48" />
      ) : liste.length === 0 ? (
        <Leerzustand
          icon={FileText}
          titel={alle.length ? t('handbuch.nichtsGefunden') : t('handbuch.prozesse.leer')}
          {...(!alle.length && admin ? { text: t('handbuch.prozesse.leerAdmin') } : {})}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {liste.map((e) => (
            <ProzessZeile
              key={e.id}
              eintrag={e}
              admin={admin}
              onNeueVersion={() => {
                setDialog(e)
              }}
            />
          ))}
        </ul>
      )}
      {dialog && (
        <ProzessDialog
          eintrag={dialog === 'neu' ? null : dialog}
          vorhandene={alle}
          onSchliessen={() => {
            setDialog(null)
          }}
        />
      )}
    </div>
  )
}
