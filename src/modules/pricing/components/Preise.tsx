import { FileSpreadsheet, Search, Tag } from 'lucide-react'
import { Suspense, lazy, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { cn } from '@/lib/utils'
import { supabase } from '@/services/supabase'
import { useDarfPreise, usePreisliste } from '../hooks/usePreise'
import { PREIS_ANSICHTEN, type PreisAnsicht } from '../types'

const PreisListe = lazy(() => import('./PreisListe'))
const Kundenansicht = lazy(() => import('./Kundenansicht'))
const Kalkulation = lazy(() => import('./Kalkulation'))
const ArtikelAkte = lazy(() => import('./ArtikelAkte'))
const ExcelImportDialog = lazy(() => import('./ExcelImportDialog'))

export interface PreiseProps {
  ansicht: PreisAnsicht | null
  /** Offener Artikel (?artikel=…). */
  artikelId: string | null
  /** Kalkulation zu dieser Offerte (?offerte=…), kommt aus der Offert-Akte. */
  offerteId: string | null
  onAdresse: (a: { ansicht?: PreisAnsicht; artikel?: string | null; offerte?: string | null }) => void
}

/**
 * «Preise» (V59, V61, V80, V89, V226): Preisliste und Archiv mit Einkauf und Marge, Kundenansicht für alle
 * und die Kalkulation. Ohne Recht «preise» ist nur die Kundenansicht da (aus Marge und VK liesse sich der
 * Einkauf zurückrechnen); die Datenbank liefert dann auch keine Einkaufspreise.
 */
export default function Preise({ ansicht, artikelId, offerteId, onAdresse }: PreiseProps) {
  const { t } = useTranslation()
  const darf = useDarfPreise()
  const liste = usePreisliste()
  const kategorien = useAuswahl('artikelkategorie')
  const [suche, setSuche] = useState('')
  const [kategorie, setKategorie] = useState<string[]>([])
  const [importieren, setImportieren] = useState(false)
  const s = useDeferredValue(suche)
  const ziel: PreisAnsicht = darf ? (ansicht ?? 'liste') : 'kunden'
  const sichtbar = darf ? PREIS_ANSICHTEN : (['kunden'] as const)

  const imReiter = useMemo(
    () => (liste.data ?? []).filter((a) => (ziel === 'archiv' ? a.archiviertAm !== null : a.archiviertAm === null)),
    [liste.data, ziel],
  )
  const gefunden = useMemo(() => {
    const woerter = s.toLowerCase().split(/\s+/).filter(Boolean)
    return imReiter.filter((a) => woerter.every((w) => a.suchtext.includes(w)))
  }, [imReiter, s])
  const gefiltert = gefunden.filter((a) => kategorie.length === 0 || kategorie.includes(a.kategorie))

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Tag} titel={t('preise.vorschau')} text={t('preise.vorschauText')} />
      </div>
    )
  }

  const offen = artikelId ? (liste.data ?? []).find((a) => a.id === artikelId) : undefined
  const mitFilter = ziel !== 'kalkulation'

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('preise.titel')}
        beschreibung={t(darf ? 'preise.beschreibung' : 'preise.beschreibungKunden')}
        {...(darf && ziel === 'liste'
          ? {
              aktionen: (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setImportieren(true)
                  }}
                >
                  <FileSpreadsheet />
                  {t('preise.import.knopf')}
                </Button>
              ),
            }
          : {})}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <nav aria-label={t('preise.ansichten')} className="-mx-1 flex flex-wrap gap-x-1 border-b px-1">
          {sichtbar.map((a) => (
            <button
              key={a}
              type="button"
              aria-current={a === ziel ? 'page' : undefined}
              onClick={() => {
                onAdresse({ ansicht: a })
              }}
              className={cn(
                'text-muted-foreground hover:text-foreground focus-visible:ring-ring -mb-px inline-flex h-9 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 text-sm outline-none focus-visible:ring-2',
                a === ziel && 'border-accent text-foreground font-medium',
              )}
            >
              {t(`preise.ansicht.${a}`)}
            </button>
          ))}
        </nav>
        {mitFilter && (
          <label className="relative w-full md:w-72">
            <span className="sr-only">{t('preise.suche')}</span>
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              type="search"
              value={suche}
              placeholder={t('preise.sucheHinweis')}
              className="pl-8"
              onChange={(e) => {
                setSuche(e.target.value)
              }}
            />
          </label>
        )}
      </div>

      {mitFilter && (
        <Filterchips
          beschriftung={t('preise.spalte.kategorie')}
          gewaehlt={kategorie}
          onChange={setKategorie}
          optionen={kategorien.werte
            .map((k) => ({
              wert: k.schluessel,
              text: kategorien.text(k.schluessel),
              anzahl: gefunden.filter((a) => a.kategorie === k.schluessel).length,
            }))
            .filter((o) => o.anzahl > 0)}
        />
      )}

      {liste.error ? (
        <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
      ) : liste.isPending ? (
        <Skelett className="h-96" />
      ) : (
        <Suspense fallback={<Skelett className="h-96" />}>
          {(ziel === 'liste' || ziel === 'archiv') && (
            <PreisListe
              artikel={gefiltert}
              alle={liste.data}
              archiv={ziel === 'archiv'}
              aktiveId={artikelId}
              onOeffnen={(id) => {
                onAdresse({ artikel: id })
              }}
            />
          )}
          {ziel === 'kunden' && <Kundenansicht artikel={gefiltert} />}
          {ziel === 'kalkulation' && (
            <Kalkulation
              artikel={liste.data.filter((a) => a.archiviertAm === null)}
              offerteId={offerteId}
              onOfferte={(id) => {
                onAdresse({ offerte: id })
              }}
            />
          )}
        </Suspense>
      )}

      <Suspense>
        {artikelId && darf && (
          <ArtikelAkte
            artikel={offen ?? null}
            alle={liste.data ?? []}
            onOeffnen={(id) => {
              onAdresse({ artikel: id })
            }}
            onSchliessen={() => {
              onAdresse({ artikel: null })
            }}
          />
        )}
        {importieren && (
          <ExcelImportDialog
            onSchliessen={() => {
              setImportieren(false)
            }}
          />
        )}
      </Suspense>
    </div>
  )
}
