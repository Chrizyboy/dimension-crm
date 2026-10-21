import { Plus, Search, SearchX, Users } from 'lucide-react'
import { Suspense, lazy, useDeferredValue, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { useKontakte } from '@/hooks/useKontakte'
import { useTaste } from '@/hooks/useTaste'
import { passtZurSuche } from '@/lib/kontakt'
import { supabase } from '@/services/supabase'
import type { AkteReiter } from '../types'
import { kundenSpalten } from './kundenSpalten'
import { StandFilter } from './StandFilter'

const Kundenakte = lazy(() => import('./Kundenakte'))
const KontaktDialog = lazy(() => import('./KontaktDialog'))

/** Kunden sind Privatpersonen und Firmen sowie alle, die schon ein Geschäft mit uns haben. */
const KUNDENARTEN = new Set(['privat', 'firma'])

export interface KundenProps {
  /** Offene Kundenakte aus der Adresse (?kunde=…). */
  kundeId: string | null
  reiter: AkteReiter
  onAkte: (id: string | null, reiter?: AkteReiter) => void
}

/**
 * Kundenliste (V233 «Kunden»): suchen nach Name, Ort, Mail, Telefon oder Nummer, filtern nach Stand,
 * sortieren per Klick auf die Spalte. Ein Klick öffnet die 360°-Kundenakte als Seitenpanel.
 */
export default function Kunden({ kundeId, reiter, onAkte }: KundenProps) {
  const { t } = useTranslation()
  const kontakte = useKontakte()
  const [suche, setSuche] = useState('')
  const [gruppen, setGruppen] = useState<string[]>([])
  const [neu, setNeu] = useState(false)
  const suchfeld = useRef<HTMLInputElement>(null)
  // Die Liste filtert erst, wenn die Tastatur kurz ruht; das Tippen bleibt flüssig.
  const verzoegert = useDeferredValue(suche)

  useTaste('n', () => {
    setNeu(true)
  })
  useTaste('/', () => suchfeld.current?.focus())

  const kunden = useMemo(
    () => (kontakte.data ?? []).filter((k) => KUNDENARTEN.has(k.kontaktart) || k.stand !== null),
    [kontakte.data],
  )
  const anzahl = useMemo(() => {
    const z: Record<string, number> = {}
    for (const k of kunden) if (k.standGruppe) z[k.standGruppe] = (z[k.standGruppe] ?? 0) + 1
    return z
  }, [kunden])
  const sichtbar = useMemo(
    () =>
      kunden.filter(
        (k) => (gruppen.length === 0 || gruppen.includes(k.standGruppe ?? '')) && passtZurSuche(k, verzoegert),
      ),
    [kunden, gruppen, verzoegert],
  )
  const spalten = useMemo(() => kundenSpalten(t), [t])

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Users} titel={t('kunden.vorschau')} text={t('kunden.vorschauText')} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('kunden.titel')}
        beschreibung={t('kunden.beschreibung')}
        aktionen={
          <Button
            onClick={() => {
              setNeu(true)
            }}
          >
            <Plus />
            {t('kunden.neu')}
            <Kbd className="bg-primary-foreground/15 text-primary-foreground ml-1 border-0">N</Kbd>
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-80">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-2 left-2.5 size-4"
              aria-hidden="true"
            />
            <Input
              ref={suchfeld}
              type="search"
              value={suche}
              onChange={(e) => {
                setSuche(e.target.value)
              }}
              placeholder={t('kunden.suche')}
              aria-label={t('kunden.suche')}
              className="pr-8 pl-8"
            />
            <Kbd className="absolute top-1.5 right-1.5">/</Kbd>
          </div>
          <p className="text-muted-foreground text-sm sm:ml-auto" aria-live="polite">
            {kontakte.isSuccess && t('kunden.anzahl', { count: sichtbar.length })}
          </p>
        </div>
        <StandFilter gewaehlt={gruppen} anzahl={anzahl} onChange={setGruppen} />
      </div>

      <div className="bg-surface overflow-hidden rounded-xl border">
        {kontakte.isError ? (
          <Fehlerzustand details={String(kontakte.error)} onNochmal={() => void kontakte.refetch()} />
        ) : (
          <Datentabelle
            beschriftung={t('kunden.titel')}
            daten={sichtbar}
            spalten={spalten}
            kennung={(k) => k.id}
            aktiveId={kundeId}
            onOeffnen={(k) => {
              onAkte(k.id)
            }}
            sortierung={[{ id: 'name', desc: false }]}
            laedt={kontakte.isPending}
            leer={
              kunden.length === 0 ? (
                <Leerzustand
                  icon={Users}
                  titel={t('kunden.leer')}
                  text={t('kunden.leerText')}
                  aktion={
                    <Button
                      onClick={() => {
                        setNeu(true)
                      }}
                    >
                      <Plus />
                      {t('kunden.neu')}
                    </Button>
                  }
                />
              ) : (
                <Leerzustand
                  icon={SearchX}
                  titel={t('kunden.keineTreffer')}
                  text={t('kunden.keineTrefferText')}
                  aktion={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSuche('')
                        setGruppen([])
                      }}
                    >
                      {t('kunden.filterZuruecksetzen')}
                    </Button>
                  }
                />
              )
            }
          />
        )}
      </div>

      <Suspense>
        {kundeId && (
          <Kundenakte
            id={kundeId}
            reiter={reiter}
            onReiter={(r) => {
              onAkte(kundeId, r)
            }}
            onSchliessen={() => {
              onAkte(null)
            }}
          />
        )}
        {neu && (
          <KontaktDialog
            kontaktart="privat"
            onSchliessen={(id) => {
              setNeu(false)
              if (id) onAkte(id)
            }}
          />
        )}
      </Suspense>
    </div>
  )
}
