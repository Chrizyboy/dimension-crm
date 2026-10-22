import { Inbox, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { ausgangJetztSenden, meldeIntegrationsFehler } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { supabase } from '@/services/supabase'
import { useAusgang, useAusgangNeuLaden } from '../hooks/useAusgang'
import { AUSGANG_FILTER, type AusgangFilter } from '../types'
import { AusgangDetail } from './AusgangDetail'
import { ausgangSpalten } from './ausgangSpalten'

/**
 * Ausgangskorb: alles, was das CRM nach aussen schicken will (Mails, SMS), wartet hier auf einen
 * Menschen. Nur freigegebene Einträge sendet der Server; «automatisch» heisst, eine Automation war
 * ausdrücklich so eingestellt (Regel 6).
 */
export default function Ausgangskorb({
  offenId,
  onOeffnen,
}: {
  offenId: string | null
  onOeffnen: (id: string | null) => void
}) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<AusgangFilter>('offen')
  const liste = useAusgang(filter)
  const neuLaden = useAusgangNeuLaden()
  const [sendet, setSendet] = useState(false)
  const spalten = useMemo(() => ausgangSpalten(t), [t])

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Send} titel={t('ausgang.titel')} text={t('ausgang.ohneDatenbank')} />
      </div>
    )
  }

  const eintraege = liste.data ?? []
  const bereit = eintraege.filter((e) => e.status === 'freigegeben').length
  const offen = offenId ? eintraege.find((e) => e.id === offenId) : undefined

  async function jetztSenden() {
    setSendet(true)
    try {
      const r = await ausgangJetztSenden()
      melde(r.fehler ? 'info' : 'ok', {
        de: `${r.gesendet} gesendet${r.fehler ? `, ${r.fehler} mit Fehler` : ''}`,
        fr: `${r.gesendet} envoyé(s)${r.fehler ? `, ${r.fehler} en erreur` : ''}`,
      })
    } catch (e) {
      meldeIntegrationsFehler(e)
    } finally {
      setSendet(false)
      void neuLaden()
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('ausgang.titel')}
        beschreibung={t('ausgang.beschreibung')}
        aktionen={
          bereit > 0 && (
            <Button onClick={() => void jetztSenden()} laedt={sendet}>
              <Send />
              {t('ausgang.jetztSendenAnzahl', { count: bereit })}
            </Button>
          )
        }
      />
      <Filterchips
        einzeln
        beschriftung={t('ausgang.filter')}
        gewaehlt={[filter]}
        onChange={([f]) => {
          if (f) setFilter(f as AusgangFilter)
        }}
        optionen={AUSGANG_FILTER.map((f) => ({ wert: f, text: t(`ausgang.filterwert.${f}`) }))}
      />
      {liste.error ? (
        <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
      ) : liste.isPending ? (
        <Skelett className="h-96" />
      ) : (
        <Datentabelle
          daten={eintraege}
          spalten={spalten}
          kennung={(e) => e.id}
          aktiveId={offenId}
          onOeffnen={(e) => {
            onOeffnen(e.id)
          }}
          beschriftung={t('ausgang.titel')}
          leer={<Leerzustand icon={Inbox} titel={t('ausgang.leer')} text={t('ausgang.leerText')} />}
        />
      )}
      {offen && (
        <AusgangDetail
          key={offen.id}
          eintrag={offen}
          onSchliessen={() => {
            onOeffnen(null)
          }}
          onGeaendert={() => void neuLaden()}
        />
      )}
    </div>
  )
}
