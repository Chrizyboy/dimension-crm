import { BookOpen, FileText, PlayCircle, Search } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { findeModul } from '@/lib/navigation'
import { useUi } from '@/stores/ui'
import { useHandbuch } from '../hooks/useHandbuch'
import { useAlleKapitel, useInhalt } from '../hooks/useKapitel'
import { fassung, passt } from '../lib/handbuch'
import { blockText, sucheImKapitel } from '../lib/kapitel'
import { oeffneDatei } from './Oeffnen'

/**
 * Suche über das ganze Handbuch: jede Anleitung in jedem Kapitel, Begriffe, Prozesse und Videos. Ein Klick springt
 * direkt an die Stelle im Kapitel. Alle Kapitel, auch Bereiche, die die Person nicht sieht: Wissen ist nicht geheim.
 */
export function SuchErgebnisse({
  suche,
  onKapitel,
  onAnsicht,
}: {
  suche: string
  onKapitel: (id: string, stelle: string | null) => void
  onAnsicht: (a: 'begriffe' | 'videos') => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const kapitel = useAlleKapitel()
  const begriffe = useInhalt('begriffe')
  const handbuch = useHandbuch()
  const q = suche.trim().toLowerCase()

  const treffer = useMemo(
    () =>
      (kapitel.data ?? [])
        .flatMap((k) => sucheImKapitel(k, q))
        .sort((a, b) => b.punkte - a.punkte)
        .slice(0, 30),
    [kapitel.data, q],
  )
  const begriffTreffer = (begriffe.data?.abschnitte ?? []).filter((a) =>
    `${a.titel} ${blockText(a.bloecke)}`.toLowerCase().includes(q),
  )
  const eintraege = (handbuch.data ?? []).filter((e) => passt(e, q))

  if (kapitel.isPending) return <Skelett className="h-64 w-full" />
  if (!treffer.length && !begriffTreffer.length && !eintraege.length)
    return <Leerzustand icon={Search} titel={t('handbuch.nichtsGefunden')} text={t('handbuch.suche.leerText')} />

  return (
    <div className="flex flex-col gap-5">
      {treffer.length > 0 && (
        <section aria-labelledby="suche-kapitel" className="flex flex-col gap-2">
          <h2 id="suche-kapitel" className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {t('handbuch.suche.anleitungen')}
          </h2>
          <ul className="flex flex-col gap-2">
            {treffer.map((x) => (
              <li key={`${x.kapitel}-${x.anker ?? ''}`}>
                <button
                  type="button"
                  onClick={() => {
                    onKapitel(x.kapitel, x.anker)
                  }}
                  className="bg-surface hover:bg-muted focus-visible:ring-ring flex w-full items-start gap-3 rounded-lg border p-3 text-left outline-none focus-visible:ring-2"
                >
                  <BookOpen className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-muted-foreground text-xs">{findeModul(x.kapitel)?.titel[sprache]}</span>
                    <span className="font-medium">{x.titel}</span>
                    <span className="text-muted-foreground line-clamp-2 text-sm">{x.ausschnitt}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {(begriffTreffer.length > 0 || eintraege.length > 0) && (
        <section aria-labelledby="suche-mehr" className="flex flex-col gap-2">
          <h2 id="suche-mehr" className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {t('handbuch.suche.mehr')}
          </h2>
          <ul className="grid gap-2 md:grid-cols-2">
            {begriffTreffer.map((a) => (
              <li key={a.schluessel}>
                <button
                  type="button"
                  onClick={() => {
                    onAnsicht('begriffe')
                  }}
                  className="bg-surface hover:bg-muted flex w-full flex-col gap-0.5 rounded-lg border p-3 text-left"
                >
                  <span className="text-muted-foreground text-xs">{t('handbuch.reiter.begriffe')}</span>
                  <span className="font-medium">{a.titel}</span>
                  <span className="text-muted-foreground line-clamp-2 text-sm">{blockText(a.bloecke)}</span>
                </button>
              </li>
            ))}
            {eintraege.map((e) => {
              const f = fassung(e, sprache)
              const Icon = e.art === 'prozess' ? FileText : PlayCircle
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (e.art === 'prozess') void oeffneDatei(f.datei)
                      else onAnsicht('videos')
                    }}
                    className="bg-surface hover:bg-muted flex w-full items-start gap-3 rounded-lg border p-3 text-left"
                  >
                    <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium">{f.titel}</span>
                      {f.beschreibung && <span className="text-muted-foreground text-sm">{f.beschreibung}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
