import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { listenZahlen } from '../lib/rollen'

/**
 * Zahlen über der Liste. Ein Klick filtert auf die Rolle, die dazu gehört (Gesuche → Netzbetreiber,
 * Nachweise und Aufträge → Subunternehmer), damit man von der Zahl direkt zu den Partnern kommt.
 */
export function ListenZahlen({
  z,
  onFilter,
}: {
  z: ReturnType<typeof listenZahlen>
  onFilter: (rolle: string) => void
}) {
  const { t } = useTranslation()
  const kacheln: { text: string; wert: number; zusatz?: string | undefined; rolle?: string; warnung?: boolean }[] = [
    { text: t('adressbuch.zahlen.partner'), wert: z.partner },
    {
      text: t('adressbuch.zahlen.gesuche'),
      wert: z.gesucheOffen,
      zusatz: z.gesucheAlt > 0 ? t('adressbuch.zahlen.gesucheAlt', { count: z.gesucheAlt }) : undefined,
      rolle: 'netzbetreiber',
      warnung: z.gesucheAlt > 0,
    },
    {
      text: t('adressbuch.zahlen.nachweise'),
      wert: z.nachweiseFaellig,
      rolle: 'subunternehmer',
      warnung: z.nachweiseFaellig > 0,
    },
    { text: t('adressbuch.zahlen.auftraege'), wert: z.auftraegeLaufend, rolle: 'subunternehmer' },
  ]
  return (
    <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {kacheln.map((k) => {
        const inhalt = (
          <>
            <span className="text-muted-foreground text-xs">{k.text}</span>
            <span className={cn('zahlen font-display text-xl font-semibold', k.warnung && 'text-warn')}>{k.wert}</span>
            {k.zusatz && <span className="text-warn text-xs">{k.zusatz}</span>}
          </>
        )
        return (
          <li key={k.text}>
            {k.rolle ? (
              <button
                type="button"
                onClick={() => {
                  if (k.rolle) onFilter(k.rolle)
                }}
                className="bg-surface hover:bg-muted focus-visible:ring-ring flex h-full w-full flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left outline-none focus-visible:ring-2"
              >
                {inhalt}
              </button>
            ) : (
              <div className="bg-surface flex h-full flex-col gap-0.5 rounded-lg border px-3 py-2">{inhalt}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
