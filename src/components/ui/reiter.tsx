import { ChevronDown } from 'lucide-react'
import { Tabs as TabsPrimitive } from 'radix-ui'
import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  useContext,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt } from './menue'

/**
 * Wie viele Reiter höchstens in einer Leiste stehen (Chris 4.11.2026 «zu unübersichtlich», Entscheid 0058).
 * Sind es mehr, stehen die vorderen und der gewählte da, der Rest klappt mit «Mehr» auf; zusammen nie mehr als so viele.
 */
export const REITER_HOECHSTENS = 6

/**
 * Teilt Reiter in sichtbare und solche unter «Mehr». Der gewählte bleibt immer sichtbar (er ersetzt dann
 * den letzten der vorderen), damit man sieht, wo man ist. Reihenfolge bleibt wie übergeben.
 */
export function teileReiter<T>(werte: readonly T[], aktiv: T | undefined, hoechstens = REITER_HOECHSTENS) {
  if (werte.length <= hoechstens) return { sichtbar: [...werte], mehr: [] as T[] }
  const vorne = werte.slice(0, hoechstens - 1)
  const sichtbar =
    aktiv !== undefined && werte.includes(aktiv) && !vorne.includes(aktiv) ? [...vorne.slice(0, -1), aktiv] : vorne
  return { sichtbar, mehr: werte.filter((w) => !sichtbar.includes(w)) }
}

/** Gewählter Reiter und Wechsel, damit «Mehr» in der Leiste einen versteckten Reiter wählen kann. */
const ReiterZustand = createContext<{ wert?: string; setWert: (w: string) => void } | null>(null)

/** Reiter-Gruppe (Radix Tabs); merkt sich den gewählten Reiter auch ohne `value` für «Mehr». */
export function Reiter({ value, defaultValue, onValueChange, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  const [eigen, setEigen] = useState(defaultValue)
  const wert = value ?? eigen
  const setWert = (w: string) => {
    setEigen(w)
    onValueChange?.(w)
  }
  return (
    <ReiterZustand.Provider value={{ ...(wert === undefined ? {} : { wert }), setWert }}>
      <TabsPrimitive.Root {...(wert === undefined ? {} : { value: wert })} onValueChange={setWert} {...props} />
    </ReiterZustand.Provider>
  )
}

/**
 * Aussehen der Reiterleiste, auch für Ansichten, die als Adresse statt als Reiter umschalten (Offerten, Verkauf).
 * Immer eine Zeile: Was nicht Platz hat, schiebt man seitlich (Handy, schmales Seitenpanel). Die Linie unten
 * ist ein Schatten statt Rahmen, damit die orange Linie des aktiven Reiters beim Wischen nicht abgeschnitten wird.
 */
export const reiterListeKlasse =
  'wischzeile flex flex-nowrap gap-x-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--border)]'

/** Aussehen eines Reiters; aktiv über `data-state="active"` (Radix) oder `aria-current` (Ansichten). */
export const reiterKnopfKlasse =
  'text-muted-foreground hover:text-foreground focus-visible:ring-ring data-[state=active]:border-accent data-[state=active]:text-foreground data-[state=active]:font-medium aria-[current=page]:border-accent aria-[current=page]:text-foreground aria-[current=page]:font-medium inline-flex h-9 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 text-sm whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-inset'

/** Löst Fragmente auf, damit `<>…</>` als einzelne Reiter zählt. */
function eintraege(inhalt: ReactNode): ReactNode[] {
  return Children.toArray(inhalt).flatMap((k) =>
    isValidElement(k) && k.type === Fragment
      ? eintraege((k as ReactElement<{ children?: ReactNode }>).props.children)
      : [k],
  )
}

/** Wert eines Reiters (`value` von `ReiterKnopf`). */
function wertVon(k: ReactNode): string | undefined {
  return isValidElement(k) ? (k.props as { value?: string }).value : undefined
}

/**
 * Knopf «Mehr ▾» neben einer Reiterleiste. Steht ausserhalb der Liste, weil eine `tablist` nur Reiter enthalten darf.
 */
export function ReiterMehr({
  eintraege: liste,
}: {
  eintraege: { wert: string; inhalt: ReactNode; onWahl: () => void }[]
}) {
  const { t } = useTranslation()
  if (liste.length === 0) return null
  return (
    <Menue>
      <MenueAusloeser className={reiterKnopfKlasse} data-reiter-mehr="">
        {t('knopfleiste.mehr')}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </MenueAusloeser>
      <MenueInhalt align="end">
        {liste.map((e) => (
          <MenueEintrag key={e.wert} onSelect={e.onWahl}>
            {e.inhalt}
          </MenueEintrag>
        ))}
      </MenueInhalt>
    </Menue>
  )
}

/** Leiste der Reiter (z.B. Kundenblatt: Übersicht · Objekte · Offerten · Projekte); mehr als sechs mit «Mehr». */
export function ReiterListe({ className, children, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  const zustand = useContext(ReiterZustand)
  const liste = eintraege(children)
  const werte = liste.map(wertVon).filter((w): w is string => w !== undefined)
  if (!zustand || werte.length <= REITER_HOECHSTENS) {
    return (
      <TabsPrimitive.List className={cn(reiterListeKlasse, className)} {...props}>
        {children}
      </TabsPrimitive.List>
    )
  }
  const { sichtbar } = teileReiter(werte, zustand.wert)
  const versteckt = liste.filter((k) => {
    const w = wertVon(k)
    return w !== undefined && !sichtbar.includes(w)
  })
  return (
    <div className={cn(reiterListeKlasse, className)}>
      <TabsPrimitive.List className="flex flex-nowrap gap-x-1" {...props}>
        {liste.filter((k) => !versteckt.includes(k))}
      </TabsPrimitive.List>
      <ReiterMehr
        eintraege={versteckt.map((k) => {
          const w = wertVon(k) ?? ''
          return {
            wert: w,
            inhalt: (k as ReactElement<{ children?: ReactNode }>).props.children,
            onWahl: () => {
              zustand.setWert(w)
            },
          }
        })}
      />
    </div>
  )
}

/** Ein Reiter. */
export function ReiterKnopf({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger className={cn(reiterKnopfKlasse, className)} {...props} />
}

/** Inhalt eines Reiters. */
export function ReiterInhalt({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('pt-4 outline-none', className)} {...props} />
}
