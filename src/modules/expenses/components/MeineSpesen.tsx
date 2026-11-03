import { Mail, MessageCircleQuestion, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { formatChf, formatDatum } from '@/lib/format'
import { useSpesen } from '../hooks/useSpesen'
import { filtern, heuteZuerich, meineZahlen, summe } from '../lib/spesen'
import type { Spese, SpesenFilter } from '../types'
import { AnBuchhaltung } from './AnBuchhaltung'
import { GrundDialog } from './GrundDialog'
import { Kacheln } from './Kacheln'
import { SpeseErfassen } from './SpeseErfassen'
import { SpesenTabelle } from './SpesenTabelle'

const FILTER: SpesenFilter[] = ['offen', 'ausbezahlt', 'firmenkarte', 'abgelehnt', 'alle']
type Fenster = { aendern: Spese } | { storno: Spese } | 'mail' | null

/**
 * Meine Spesen (jede Person): was ausbezahlt wird und wann, was bei der Buchhaltung liegt, Rückfragen zum
 * Beantworten (Spese ändern), Liste mit Filter. Ändern und zurückziehen bis zur Prüfung.
 */
export function MeineSpesen({ personId }: { personId: string }) {
  const { t } = useTranslation()
  const daten = useSpesen(personId)
  const [filter, setFilter] = useState<SpesenFilter>('offen')
  const [auswahl, setAuswahl] = useState<Set<string>>(new Set())
  const [fenster, setFenster] = useState<Fenster>(null)
  const alle = useMemo(() => daten.data ?? [], [daten.data])
  const liste = useMemo(() => filtern(alle, filter), [alle, filter])
  const z = meineZahlen(alle, heuteZuerich().slice(0, 4))
  const gewaehlt = liste.filter((s) => auswahl.has(s.id))
  // Ohne Auswahl gilt «An die Buchhaltung» für alle offenen eigenen Spesen (V233).
  const fuerMail = gewaehlt.length > 0 ? gewaehlt : filtern(alle, 'offen')
  const zu = () => {
    setFenster(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <Kacheln
        kacheln={[
          {
            zahl: formatChf(z.geprueft.rappen, { mitWaehrung: true }),
            text: t('spesen.meine.wirdAusbezahlt', { count: z.geprueft.anzahl }),
            ton: 'ok',
          },
          {
            zahl: formatChf(z.eingereicht.rappen, { mitWaehrung: true }),
            text: t('spesen.meine.beiBuchhaltung', { count: z.eingereicht.anzahl }),
          },
          {
            zahl: String(z.rueckfragen.length),
            text: t('spesen.meine.rueckfragen'),
            ...(z.rueckfragen.length ? { ton: 'warn' as const } : {}),
          },
          {
            zahl: formatChf(z.jahr.rappen, { mitWaehrung: true }),
            text: z.letzte
              ? t('spesen.meine.jahrLetzte', {
                  datum: formatDatum(z.letzte.am),
                  mit: t(`spesen.auszahlen.${z.letzte.mit ?? 'lohn'}`),
                })
              : t('spesen.meine.jahr'),
          },
        ]}
      />
      {z.rueckfragen.map((s) => (
        <div
          key={s.id}
          role="status"
          className="bg-warn-soft text-warn flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm"
        >
          <MessageCircleQuestion className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            <b>{t('spesen.meine.rueckfrageZu', { zweck: s.zweck ?? '', datum: formatDatum(s.datum) })}</b> «
            {s.rueckfrage}»
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setFenster({ aendern: s })
            }}
          >
            {t('spesen.meine.beantworten')}
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          einzeln
          beschriftung={t('spesen.filter')}
          optionen={FILTER.map((f) => ({
            wert: f,
            text: t(`spesen.filterwert.${f}`),
            anzahl: filtern(alle, f).length,
          }))}
          gewaehlt={[filter]}
          onChange={([f]) => {
            if (f) setFilter(f as SpesenFilter)
            setAuswahl(new Set())
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground zahlen text-sm">
            {t('spesen.summe', { betrag: formatChf(summe(liste), { mitWaehrung: true }) })}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={fuerMail.length === 0}
            onClick={() => {
              setFenster('mail')
            }}
          >
            <Mail />
            {t('spesen.mail.knopf', { count: fuerMail.length })}
          </Button>
        </div>
      </div>
      {daten.error ? (
        <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
      ) : !daten.data ? (
        <Skelett className="h-64" />
      ) : liste.length === 0 ? (
        <Leerzustand icon={Wallet} titel={t('spesen.leer')} text={t('spesen.leerText')} />
      ) : (
        <SpesenTabelle
          liste={liste}
          mitPerson={false}
          auswahl={auswahl}
          onAuswahl={setAuswahl}
          waehlbar={(s) => ['eingereicht', 'rueckfrage', 'geprueft'].includes(s.status)}
          onAendern={(s) => {
            setFenster({ aendern: s })
          }}
          onStorno={(s) => {
            setFenster({ storno: s })
          }}
        />
      )}
      {fenster === 'mail' && <AnBuchhaltung spesen={fuerMail} onSchliessen={zu} />}
      {fenster && typeof fenster === 'object' && 'aendern' in fenster && (
        <SpeseErfassen personId={personId} spese={fenster.aendern} onSchliessen={zu} />
      )}
      {fenster && typeof fenster === 'object' && 'storno' in fenster && (
        <GrundDialog art="storno" spese={fenster.storno} onSchliessen={zu} />
      )}
    </div>
  )
}
