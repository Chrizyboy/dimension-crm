import { Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/schalter'
import { formatChf } from '@/lib/format'
import { zielVon } from '@/lib/ziel'
import { cn } from '@/lib/utils'
import { useUi } from '@/stores/ui'
import type { TagZeile as Zeile } from '../types'

/** Datum kurz: «heute», «morgen» oder 27.10.2026. */
function wann(datum: string | undefined, heute: string, t: (s: string) => string): string {
  if (!datum) return ''
  if (datum === heute) return t('tag.heute')
  const morgen = new Date(Date.parse(heute) + 86_400_000).toISOString().slice(0, 10)
  if (datum === morgen) return t('tag.morgen')
  // Im laufenden Jahr reicht «22.10.», sonst «10.03.25»; so bleibt die Spalte schmal und nichts überlappt.
  const tagMonat = `${datum.slice(8, 10)}.${datum.slice(5, 7)}.`
  return datum.slice(0, 4) === heute.slice(0, 4) ? tagMonat : `${tagMonat}${datum.slice(2, 4)}`
}

/**
 * Eine Zeile in «Mein Tag»: links wann, Mitte wer/was (Klick öffnet den Datensatz), rechts Status oder Betrag.
 * Telefon als eigener Knopf, damit man am Handy direkt anrufen kann. Aufgaben haben ein Häkchen.
 */
export function TagZeile({ zeile, heute, onAbhaken }: { zeile: Zeile; heute: string; onAbhaken?: (z: Zeile) => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const ziel = zielVon(zeile.tabelle, zeile.id)
  const unter = sprache === 'fr' && zeile.name_fr ? zeile.name_fr : zeile.unter
  const datum = wann(zeile.datum, heute, t)

  const status = (zeile.bewilligung ||
    zeile.prioritaet === 'hoch' ||
    zeile.ueberfaellig ||
    zeile.betrag_rappen != null) && (
    <>
      {zeile.bewilligung && <Badge ton="info">{t('tag.bewilligung')}</Badge>}
      {zeile.prioritaet === 'hoch' && <Badge ton="kritisch">{t('tag.hoch')}</Badge>}
      {zeile.ueberfaellig && <Badge ton="kritisch">{t('tag.ueberfaellig')}</Badge>}
      {zeile.betrag_rappen != null && (
        <span className="zahlen font-mono text-xs whitespace-nowrap">{formatChf(zeile.betrag_rappen)}</span>
      )}
    </>
  )

  // In schmalen Karten (drei nebeneinander) rutschen Status und Betrag unter den Titel, damit Namen nicht
  // in Wortbrocken umbrechen; ab 30rem Kartenbreite stehen sie rechts.
  const inhalt = (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="line-clamp-2 font-medium">{zeile.titel}</span>
      {unter && <span className="text-muted-foreground line-clamp-2 text-xs">{unter}</span>}
      {status && <span className="mt-1 flex flex-wrap items-center gap-2 @[30rem]:hidden">{status}</span>}
    </span>
  )

  return (
    <li className="hover:bg-surface-2 flex items-center gap-3 px-4 py-2 text-sm">
      {onAbhaken && (
        <Checkbox
          aria-label={t('tag.abhaken', { titel: zeile.titel })}
          onCheckedChange={(an) => {
            if (an === true) onAbhaken(zeile)
          }}
        />
      )}
      <span
        className={cn(
          'zahlen w-16 shrink-0 text-xs sm:w-20',
          zeile.ueberfaellig ? 'text-bad font-medium' : 'text-muted-foreground',
        )}
      >
        {zeile.zeit ? (
          <>
            <span className="block">{datum}</span>
            <span className="text-foreground font-mono font-medium">{zeile.zeit}</span>
          </>
        ) : (
          datum
        )}
      </span>
      {ziel ? (
        <a
          href={`#${ziel}`}
          className="focus-visible:ring-ring flex min-w-0 flex-1 rounded-sm outline-none focus-visible:ring-2"
        >
          {inhalt}
        </a>
      ) : (
        inhalt
      )}
      <span className="flex shrink-0 items-center gap-2">
        {status && <span className="hidden items-center gap-2 @[30rem]:flex">{status}</span>}
        {zeile.telefon && (
          <a
            href={`tel:${zeile.telefon.replace(/\s/g, '')}`}
            aria-label={t('tag.anrufen', { nummer: zeile.telefon })}
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1.5"
          >
            <Phone className="size-4" />
          </a>
        )}
      </span>
    </li>
  )
}
