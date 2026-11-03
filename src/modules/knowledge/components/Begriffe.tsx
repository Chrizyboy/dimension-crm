import { Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Suchfeld } from '@/components/shared/Werkzeugleiste'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { useUi } from '@/stores/ui'
import { useInhalt } from '../hooks/useKapitel'
import { blockText } from '../lib/kapitel'
import { Bloecke } from './KapitelText'

/**
 * Begriffe A–Z: was Wörter wie Lead, Tranche, IBN oder Ausgangskorb im CRM bedeuten, je mit Link zum Kapitel.
 * Der Text steht in `inhalt/begriffe.<sprache>.md`, ein Abschnitt pro Begriff.
 */
export function Begriffe() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const inhalt = useInhalt('begriffe')
  const [suche, setSuche] = useState('')
  const q = suche.trim().toLowerCase()
  const liste = [...(inhalt.data?.abschnitte ?? [])]
    .filter((a) => !q || `${a.titel} ${blockText(a.bloecke)}`.toLowerCase().includes(q))
    .sort((a, b) => a.titel.localeCompare(b.titel, sprache))
  const buchstaben = [...new Set(liste.map((a) => a.titel.charAt(0).toUpperCase()))]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-muted-foreground max-w-prose text-sm">{t('handbuch.begriffe.intro')}</p>
        <Suchfeld
          beschriftung={t('handbuch.begriffe.suche')}
          value={suche}
          onChange={(e) => {
            setSuche(e.target.value)
          }}
        />
      </div>
      {inhalt.isPending && <Skelett className="h-64 w-full" />}
      {!inhalt.isPending && !liste.length && <Leerzustand icon={Search} titel={t('handbuch.nichtsGefunden')} />}
      {buchstaben.map((b) => (
        <section key={b} aria-labelledby={`begriffe-${b}`} className="flex flex-col gap-2">
          <h2 id={`begriffe-${b}`} className="font-display text-muted-foreground text-sm font-semibold">
            {b}
          </h2>
          <dl className="grid gap-2 md:grid-cols-2">
            {liste
              .filter((a) => a.titel.charAt(0).toUpperCase() === b)
              .map((a) => (
                <div key={a.schluessel} className="bg-surface rounded-lg border p-3">
                  <dt className="font-semibold">{a.titel}</dt>
                  <dd>
                    <Bloecke bloecke={a.bloecke} />
                  </dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
    </div>
  )
}
