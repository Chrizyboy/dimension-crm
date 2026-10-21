import { FileText, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Button } from '@/components/ui/button'
import { formatChf, formatDatum } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { dokumentAdresse } from '@/services/dokumente'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useOffertAenderung } from '../hooks/useOfferten'
import { entferneVersion } from '../services/offerten'
import type { Offerte } from '../types'

interface Dokument {
  id: string
  name: string
  erstellt_am: string
  sharepoint_url: string | null
  speicher_pfad: string | null
}

async function oeffne(d: { sharepoint_url: string | null; speicher_pfad: string | null }) {
  // Fenster vorher öffnen, sonst blockiert der Browser das Pop-up nach dem Warten.
  const fenster = window.open('', '_blank')
  if (fenster) fenster.opener = null
  try {
    const adresse = await dokumentAdresse(d)
    if (adresse && fenster) fenster.location.href = adresse
    else fenster?.close()
  } catch (f) {
    fenster?.close()
    meldeFehler(f, 'offerten.dokument')
    melde('kritisch', { de: 'Dokument nicht geöffnet', fr: 'Document non ouvert' })
  }
}

/** Versionen der Offerte (V67), neueste zuoberst, mit PDF; dazu alle Dokumente der Offerte. */
export function OffertVersionen({ o, dokumente }: { o: Offerte; dokumente: Dokument[] }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const entfernen = useOffertAenderung(() => entferneVersion(o.id))
  const versionen = [...o.versionen].sort((a, b) => b.v - a.v)
  // Zweimal klicken statt Bestätigungsfenster (das in der Desktop-App nicht überall erscheint).
  const [sicher, setSicher] = useState(false)

  async function letzteEntfernen() {
    if (!sicher) {
      setSicher(true)
      return
    }
    setSicher(false)
    try {
      await entfernen.mutateAsync(undefined)
      melde('ok', zweisprachig('offerten.versionen.entfernt'))
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'offerten.version')
      melde('kritisch', zweisprachig(s ?? 'fachfehler.allgemein'))
    }
  }

  return (
    <AkteAbschnitt titel={t('offerten.versionen.titel')} zusatz={versionen.length || undefined}>
      {versionen.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('offerten.versionen.keine')}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {versionen.map((v, i) => (
            <li key={v.v} className="rounded-lg border p-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">V{v.v}</span>
                <span className="text-muted-foreground text-xs">
                  {[v.am ? formatDatum(v.am) : null, v.by].filter(Boolean).join(' · ')}
                </span>
                <span className="zahlen ml-auto font-mono text-xs">
                  {[v.betragRappen ? formatChf(v.betragRappen) : null, v.kwp ? `${v.kwp} kWp` : null, v.batterie]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              {v.text && <p className="pt-1">{v.text}</p>}
              {v.dokument?.name && (
                <p className="pt-1">
                  {v.dokument.pfad ? (
                    <button
                      type="button"
                      className="text-primary dark:text-accent inline-flex items-center gap-1 text-xs hover:underline"
                      onClick={() => void oeffne({ sharepoint_url: null, speicher_pfad: v.dokument?.pfad ?? null })}
                    >
                      <FileText className="size-3.5" aria-hidden="true" />
                      {v.dokument.name}
                    </button>
                  ) : (
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                      <FileText className="size-3.5" aria-hidden="true" />
                      {v.dokument.name}
                    </span>
                  )}
                </p>
              )}
              {i === 0 && v.v > 1 && hatRecht(ich, 'admin') && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1"
                  laedt={entfernen.isPending}
                  onClick={() => void letzteEntfernen()}
                >
                  <Trash2 />
                  {t(sicher ? 'offerten.versionen.entfernenFrage' : 'offerten.versionen.entfernen')}
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
      {dokumente.length > 0 && (
        <div className="pt-3">
          <h4 className="text-muted-foreground pb-1 text-xs font-medium">{t('offerten.versionen.dokumente')}</h4>
          <ul className="flex flex-col gap-1">
            {dokumente.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  className="text-primary dark:text-accent inline-flex items-center gap-1 text-sm hover:underline"
                  onClick={() => void oeffne(d)}
                >
                  <FileText className="size-4" aria-hidden="true" />
                  {d.name}
                  <span className="text-muted-foreground text-xs">· {formatDatum(d.erstellt_am)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AkteAbschnitt>
  )
}
