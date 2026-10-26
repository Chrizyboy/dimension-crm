import { Plus, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { formatTelefon } from '@/lib/format'
import { useSubunternehmer } from '../hooks/useProjekte'
import type { Subunternehmer } from '../types'
import { SubunternehmerDialog } from './SubunternehmerDialog'

/** Stammliste der Subunternehmer (Gerüstbau, Elektro, Dachdecker …), aktive zuerst. */
export function SubunternehmerListe() {
  const { t } = useTranslation()
  const liste = useSubunternehmer()
  const [offen, setOffen] = useState<Subunternehmer | 'neu' | null>(null)

  if (liste.error) return <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
  if (liste.isPending) return <Skelett className="h-64" />

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          variant="secondary"
          onClick={() => {
            setOffen('neu')
          }}
        >
          <Plus />
          {t('projekte.subStamm.neu')}
        </Button>
      </div>
      {liste.data.length === 0 ? (
        <Leerzustand icon={Users} titel={t('projekte.subStamm.leer')} text={t('projekte.subStamm.leerText')} />
      ) : (
        <ul className="bg-surface divide-y rounded-xl border">
          {liste.data.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="hover:bg-muted/40 focus-visible:ring-ring flex w-full items-center gap-3 px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset"
                onClick={() => {
                  setOffen(s)
                }}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="line-clamp-2 text-sm font-medium">{s.name}</span>
                  <span className="text-muted-foreground line-clamp-2 text-xs">
                    {[s.gewerk, s.telefon ? formatTelefon(s.telefon) : null, s.email].filter(Boolean).join(' · ') ||
                      '–'}
                  </span>
                </span>
                <Badge>{s.sprache.toUpperCase()}</Badge>
                {!s.aktiv && <Badge>{t('projekte.subStamm.inaktiv')}</Badge>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {offen && (
        <SubunternehmerDialog
          sub={offen === 'neu' ? null : offen}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
    </div>
  )
}
