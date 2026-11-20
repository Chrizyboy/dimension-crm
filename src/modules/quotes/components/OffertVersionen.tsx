import { FileText, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { DateiFenster, type DateiFensterZustand } from '@/components/shared/dateien/DateiFenster'
import { Button } from '@/components/ui/button'
import { formatChf, formatDatum } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import type { DokumentQuelle } from '@/services/dokumente'
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

/** Versionen der Offerte (V67), neueste zuoberst, mit PDF; dazu alle Dokumente der Offerte. */
export function OffertVersionen({ o, dokumente }: { o: Offerte; dokumente: Dokument[] }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const entfernen = useOffertAenderung(() => entferneVersion(o.id))
  const versionen = [...o.versionen].sort((a, b) => b.v - a.v)
  // Zweimal klicken statt Bestätigungsfenster (das in der Desktop-App nicht überall erscheint).
  const [sicher, setSicher] = useState(false)
  const [fenster, setFenster] = useState<DateiFensterZustand>(null)
  // PDFs der Versionen und alle Dokumente der Offerte: eine Liste, damit man in der Vorschau mit ← → durchblättert.
  const versionDateien: DokumentQuelle[] = versionen.flatMap((v) =>
    v.dokument?.name && v.dokument.pfad
      ? [{ id: `v${String(v.v)}`, name: v.dokument.name, sharepoint_url: null, speicher_pfad: v.dokument.pfad }]
      : [],
  )
  // Das PDF einer Version liegt meist auch unter den Dokumenten: nur einmal zeigen.
  const dateien: DokumentQuelle[] = [
    ...versionDateien,
    ...dokumente.filter((d) => !versionDateien.some((v) => v.speicher_pfad === d.speicher_pfad)),
  ]
  const zeige = (id: string) => {
    // Ein Dokument, das schon als Version in der Liste steht, öffnet dort.
    const pfad = dokumente.find((d) => d.id === id)?.speicher_pfad
    const ziel = dateien.some((d) => d.id === id)
      ? id
      : (versionDateien.find((v) => v.speicher_pfad === pfad)?.id ?? id)
    setFenster({ art: 'vorschau', id: ziel })
  }

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
                      className="text-primary dark:text-accent flex items-start gap-1 text-left text-xs hover:underline"
                      onClick={() => {
                        zeige(`v${String(v.v)}`)
                      }}
                    >
                      <FileText className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 break-words">{v.dokument.name}</span>
                    </button>
                  ) : (
                    <span className="text-muted-foreground flex items-start gap-1 text-xs">
                      <FileText className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 break-words">{v.dokument.name}</span>
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
                  className="group flex w-full items-start gap-1.5 text-left text-sm"
                  onClick={() => {
                    zeige(d.id)
                  }}
                >
                  <FileText className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span className="text-primary dark:text-accent min-w-0 flex-1 break-words group-hover:underline">
                    {d.name}
                  </span>
                  <span className="text-muted-foreground zahlen shrink-0 pt-0.5 text-xs">
                    {formatDatum(d.erstellt_am)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <DateiFenster
        dateien={dateien}
        zustand={fenster}
        onZustand={setFenster}
        mail={{ an: o.email, sprache: o.sprache, kontakt_id: o.kontaktId, offerte_id: o.id }}
      />
    </AkteAbschnitt>
  )
}
