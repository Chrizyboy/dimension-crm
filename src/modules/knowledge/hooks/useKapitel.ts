import { useQuery } from '@tanstack/react-query'
import { ladeAlleKapitelTexte, ladeKapitelText } from '@/services/handbuchKapitel'
import { useUi } from '@/stores/ui'
import { leseKapitel, type Kapitel } from '../lib/kapitel'

/** Ein Kapitel in der Sprache der Person (ohne französische Fassung die deutsche). */
export function useKapitel(id: string | null) {
  const sprache = useUi((z) => z.sprache)
  return useQuery({
    queryKey: ['handbuch', 'kapitel', sprache, id],
    queryFn: async (): Promise<Kapitel | null> => {
      const text = id ? await ladeKapitelText(id, sprache) : null
      return text && id ? leseKapitel(id, text) : null
    },
    enabled: id !== null,
    staleTime: Infinity,
  })
}

/** Alle Kapitel (für Suche, «Neu» und die Übersicht); erst geladen, wenn eine dieser Ansichten offen ist. */
export function useAlleKapitel(aktiv = true) {
  const sprache = useUi((z) => z.sprache)
  return useQuery({
    queryKey: ['handbuch', 'kapitel', sprache, 'alle'],
    queryFn: async (): Promise<Kapitel[]> => {
      const texte = await ladeAlleKapitelTexte(sprache)
      return Object.entries(texte).map(([id, text]) => leseKapitel(id, text))
    },
    enabled: aktiv,
    staleTime: Infinity,
  })
}

/** Ein Text aus `inhalt/` (Rollen, Begriffe), als Kapitel gelesen. */
export function useInhalt(name: 'rollen' | 'begriffe') {
  const sprache = useUi((z) => z.sprache)
  return useQuery({
    queryKey: ['handbuch', 'inhalt', sprache, name],
    queryFn: async (): Promise<Kapitel> => {
      const texte = import.meta.glob<string>('../inhalt/*.md', { query: '?raw', import: 'default' })
      const laden = texte[`../inhalt/${name}.${sprache}.md`] ?? texte[`../inhalt/${name}.de.md`]
      return leseKapitel(name, laden ? await laden() : '')
    },
    staleTime: Infinity,
  })
}
