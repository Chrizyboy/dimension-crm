import { Download, FileText, Mail, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { herunterladen } from '@/lib/datei'
import { useAktion } from '../hooks/useAktion'
import { useVorlagen, useZielgruppe } from '../hooks/useMarketing'
import { adresslisteCsv, empfaenger, filtern, LEERER_FILTER, zaehlen } from '../lib/zielgruppe'
import { vermerken } from '../services/marketing'
import type { ZielFilter } from '../types'
import { LetzteAktionen } from './LetzteAktionen'
import { SerienDialog } from './SerienDialog'
import { ZielFilterLeiste } from './ZielFilterLeiste'
import { ZielTabelle } from './ZielTabelle'

/**
 * Kunden anschreiben (V233): Zielgruppe aus Leads, Offerten und Projekten filtern, auswählen und als Serienbrief
 * (PDF), Serien-E-Mail (Ausgangskorb) oder Adressliste (CSV) anschreiben. Abgemeldete sind nie dabei.
 */
export function Anschreiben({ anlage = '' }: { anlage?: ZielFilter['anlage'] }) {
  const { t } = useTranslation()
  const daten = useZielgruppe()
  const vorlagen = useVorlagen()
  const { aus } = useAktion()
  const [filter, setFilter] = useState<ZielFilter>(
    // Aus der Meldung «Nachrüstung» (Automation): gleiche Auswahl wie gezählt, Kunden mit diesem Merkmal
    anlage ? { ...LEERER_FILTER, anlage, gruppen: ['kunde'] } : LEERER_FILTER,
  )
  const [auswahl, setAuswahl] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<'brief' | 'mail' | null>(null)
  const alle = useMemo(() => daten.data ?? [], [daten.data])
  const liste = useMemo(() => filtern(alle, filter), [alle, filter])
  const gruppen = useMemo(() => zaehlen(filtern(alle, filter, 'gruppen'), 'gruppe'), [alle, filter])
  const kantone = useMemo(() => zaehlen(filtern(alle, filter, 'kantone'), 'kanton'), [alle, filter])
  const gewaehlt = alle.filter((k) => auswahl.has(k.id))

  if (daten.error) return <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
  if (!daten.data) return <Skelett className="h-96" />

  async function adressliste() {
    const r = empfaenger(gewaehlt, 'brief')
    const csv = adresslisteCsv(
      gewaehlt.filter((k) => !k.werbesperre),
      (g) => t(`marketing.gruppe.${g}`),
      (s) => (s ? t(`marketing.standort.${s}`) : ''),
    )
    herunterladen(csv, `${t('marketing.anschreiben.adresslisteDatei')}.csv`, 'text/csv;charset=utf-8')
    await aus(() =>
      vermerken(
        'adressliste',
        t('marketing.anschreiben.adressliste'),
        gewaehlt.map((k) => k.id),
        { mit_post: r.liste.length },
      ),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ZielFilterLeiste filter={filter} onFilter={setFilter} gruppen={gruppen} kantone={kantone} />
      <div className="bg-surface sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="zahlen font-medium">
            {t('marketing.anschreiben.gewaehlt', { anzahl: gewaehlt.length, von: liste.length })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAuswahl(new Set([...auswahl, ...liste.filter((k) => !k.werbesperre).map((k) => k.id)]))
            }}
          >
            {t('marketing.anschreiben.alleAngezeigten')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={auswahl.size === 0}
            onClick={() => {
              setAuswahl(new Set())
            }}
          >
            {t('marketing.anschreiben.leeren')}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={!gewaehlt.length || !vorlagen.data}
            onClick={() => {
              setDialog('brief')
            }}
          >
            <FileText />
            {t('marketing.anschreiben.serienbrief')}
          </Button>
          <Button
            size="sm"
            disabled={!gewaehlt.length || !vorlagen.data}
            onClick={() => {
              setDialog('mail')
            }}
          >
            <Mail />
            {t('marketing.anschreiben.serienmail')}
          </Button>
          <Button size="sm" variant="secondary" disabled={!gewaehlt.length} onClick={() => void adressliste()}>
            <Download />
            {t('marketing.anschreiben.adressliste')}
          </Button>
        </div>
      </div>
      {liste.length === 0 ? (
        <Leerzustand icon={Users} titel={t('marketing.anschreiben.leer')} text={t('marketing.anschreiben.leerText')} />
      ) : (
        <ZielTabelle liste={liste} auswahl={auswahl} onAuswahl={setAuswahl} />
      )}
      <LetzteAktionen />
      {dialog && vorlagen.data && (
        <SerienDialog
          art={dialog}
          auswahl={gewaehlt}
          vorlagen={vorlagen.data}
          onSchliessen={() => {
            setDialog(null)
          }}
        />
      )}
    </div>
  )
}
