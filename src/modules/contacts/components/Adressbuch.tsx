import { ArrowLeft, BookUser, Plus, SearchX, Trash2 } from 'lucide-react'
import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Suchfeld, Werkzeugleiste } from '@/components/shared/Werkzeugleiste'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/diverses'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useKontakte } from '@/hooks/useKontakte'
import { useTaste } from '@/hooks/useTaste'
import { passtZurSuche } from '@/lib/kontakt'
import { supabase } from '@/services/supabase'
import { adressbuchSpalten } from './adressbuchSpalten'

export interface AdressbuchProps {
  /** Offener Kontakt aus der Adresse (?kontakt=…), für die Markierung in der Liste. */
  aktiveId: string | null
  onOeffnen: (id: string) => void
  /** Neuer Kontakt; die gewählte Art (z. B. «lieferant») wird vorbelegt. */
  onNeu: (kontaktart: string) => void
}

/**
 * Adressbuch: alle Personen und Firmen, auch Partner, Architekt:innen, Lieferanten und Behörden.
 * Hier liegt auch der Papierkorb für Kontakte, aus dem man sie wiederherstellen kann.
 */
export default function Adressbuch({ aktiveId, onOeffnen, onNeu }: AdressbuchProps) {
  const { t } = useTranslation()
  const [papierkorb, setPapierkorb] = useState(false)
  const kontakte = useKontakte(papierkorb)
  const arten = useAuswahl('kontaktart')
  const [suche, setSuche] = useState('')
  const [gewaehlt, setGewaehlt] = useState<string[]>([])
  const suchfeld = useRef<HTMLInputElement>(null)
  const verzoegert = useDeferredValue(suche)

  useTaste(
    'n',
    () => {
      onNeu(gewaehlt.length === 1 ? (gewaehlt[0] ?? 'privat') : 'privat')
    },
    true,
    t('kuerzel.neuerKontakt'),
  )
  useTaste('/', () => suchfeld.current?.focus(), true, t('kuerzel.suche'))

  const alle = useMemo(() => kontakte.data ?? [], [kontakte.data])
  const anzahl = useMemo(() => {
    const z: Record<string, number> = {}
    for (const k of alle) z[k.kontaktart] = (z[k.kontaktart] ?? 0) + 1
    return z
  }, [alle])
  const sichtbar = useMemo(
    () =>
      alle.filter((k) => (gewaehlt.length === 0 || gewaehlt.includes(k.kontaktart)) && passtZurSuche(k, verzoegert)),
    [alle, gewaehlt, verzoegert],
  )
  const spalten = useMemo(() => adressbuchSpalten(t, arten.text), [t, arten.text])

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={BookUser} titel={t('kunden.vorschau')} text={t('kunden.vorschauText')} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-5 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={papierkorb ? t('adressbuch.papierkorbTitel') : t('adressbuch.titel')}
        beschreibung={papierkorb ? t('adressbuch.papierkorbText') : t('adressbuch.beschreibung')}
        aktionen={
          <>
            <Button
              variant={papierkorb ? 'primary' : 'ghost'}
              aria-pressed={papierkorb}
              onClick={() => {
                setPapierkorb((p) => !p)
              }}
            >
              {papierkorb ? <ArrowLeft /> : <Trash2 />}
              {papierkorb ? t('adressbuch.zurueck') : t('adressbuch.papierkorb')}
            </Button>
            {!papierkorb && (
              <Button
                onClick={() => {
                  onNeu(gewaehlt.length === 1 ? (gewaehlt[0] ?? 'privat') : 'privat')
                }}
              >
                <Plus />
                {t('adressbuch.neu')}
                <Kbd className="bg-primary-foreground/15 text-primary-foreground ml-1 border-0">N</Kbd>
              </Button>
            )}
          </>
        }
      />

      <Werkzeugleiste
        suche={
          <Suchfeld
            ref={suchfeld}
            kuerzel="/"
            beschriftung={t('kunden.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        }
        rechts={
          <span aria-live="polite">{kontakte.isSuccess && t('adressbuch.anzahl', { count: sichtbar.length })}</span>
        }
      >
        <Filterchips
          beschriftung={t('adressbuch.artFilter')}
          gewaehlt={gewaehlt}
          onChange={setGewaehlt}
          optionen={arten.werte.map((a) => ({
            wert: a.schluessel,
            text: arten.text(a.schluessel),
            anzahl: anzahl[a.schluessel] ?? 0,
          }))}
        />
      </Werkzeugleiste>

      <>
        {kontakte.isError ? (
          <Fehlerzustand details={String(kontakte.error)} onNochmal={() => void kontakte.refetch()} />
        ) : (
          <Datentabelle
            beschriftung={t('adressbuch.titel')}
            daten={sichtbar}
            spalten={spalten}
            kennung={(k) => k.id}
            aktiveId={aktiveId}
            onOeffnen={(k) => {
              onOeffnen(k.id)
            }}
            sortierung={[{ id: 'name', desc: false }]}
            laedt={kontakte.isPending}
            leer={
              alle.length === 0 ? (
                <Leerzustand
                  icon={papierkorb ? Trash2 : BookUser}
                  titel={papierkorb ? t('adressbuch.papierkorbLeer') : t('adressbuch.leer')}
                  text={papierkorb ? t('adressbuch.papierkorbLeerText') : t('adressbuch.leerText')}
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
                        setGewaehlt([])
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
      </>
    </div>
  )
}
