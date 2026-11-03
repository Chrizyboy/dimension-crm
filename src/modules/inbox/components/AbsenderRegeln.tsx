import { Trash2, Wand2 } from 'lucide-react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { spaltenHelfer, type Spalten } from '@/lib/tabelle'
import { useAbsenderRegeln } from '../hooks/useArbeit'
import { useAktion } from '../hooks/useAktion'
import { usePersonen } from '../hooks/usePosteingang'
import { regelLoeschen } from '../services/arbeit'
import type { AbsenderRegel, Person } from '../types'

const spalte = spaltenHelfer<AbsenderRegel>()

/** Spalten: Absender, Postfach (eigenes oder Team), was passiert, Löschen. */
function regelSpalten(t: TFunction, personen: Person[], loeschen: (id: string) => void): Spalten<AbsenderRegel> {
  const name = (id: string | null) => personen.find((p) => p.id === id)?.name ?? '–'
  return spalte.columns([
    spalte.accessor('absender', {
      header: t('posteingang.regel.absender'),
      cell: (c) => <span className="font-mono text-sm">{c.getValue()}</span>,
    }),
    spalte.accessor((r) => (r.postfach_person_id ? 'eigen' : 'team'), {
      id: 'postfach',
      header: t('posteingang.regel.postfach'),
      cell: (c) => <Badge>{t(`posteingang.regel.${c.getValue()}`)}</Badge>,
    }),
    spalte.accessor('aktion', {
      header: t('posteingang.regel.was'),
      cell: (c) => {
        const r = c.row.original
        if (r.aktion === 'zuweisen') return t('posteingang.regel.zeigeZuweisen', { name: name(r.person_id) })
        if (r.aktion === 'art' && r.art) return t('posteingang.regel.zeigeArt', { art: t(`posteingang.art.${r.art}`) })
        return t('posteingang.regel.aktion.ablegen')
      },
    }),
    spalte.display({
      id: 'loeschen',
      header: '',
      cell: (c) => (
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('posteingang.regel.loeschen', { absender: c.row.original.absender })}
          onClick={(e) => {
            e.stopPropagation()
            loeschen(c.row.original.id)
          }}
        >
          <Trash2 />
        </Button>
      ),
      meta: { breite: 'w-12' },
    }),
  ])
}

/**
 * Absender-Regeln: jede Person für ihr eigenes Postfach, wer verteilt auch für info@. Angelegt wird eine Regel direkt
 * aus der Mail («Mehr › Regel für diesen Absender»); hier sieht man alle und kann sie löschen (Papierkorb).
 */
export function AbsenderRegeln() {
  const { t } = useTranslation()
  const regeln = useAbsenderRegeln()
  const personen = usePersonen().data ?? []
  const { aus } = useAktion()
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">{t('posteingang.regel.liste')}</p>
      <Datentabelle
        daten={regeln.data ?? []}
        spalten={regelSpalten(t, personen, (id) => {
          void aus(() => regelLoeschen(id), { de: 'Regel gelöscht', fr: 'Règle supprimée' }).then(() =>
            regeln.refetch(),
          )
        })}
        kennung={(r) => r.id}
        laedt={regeln.isPending}
        fehler={regeln.error}
        onNochmal={() => void regeln.refetch()}
        beschriftung={t('posteingang.reiter.regeln')}
        leer={<Leerzustand icon={Wand2} titel={t('posteingang.regel.leer')} text={t('posteingang.regel.leerText')} />}
      />
    </div>
  )
}
