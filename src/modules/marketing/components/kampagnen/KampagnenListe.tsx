import { Flag, Plus, Tent } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { formatChf } from '@/lib/format'
import { useAnmeldung } from '@/stores/anmeldung'
import { useKampagnenZahlen, useWerbekampagnen } from '../../hooks/useKampagnen'
import { kostenSichtbar } from '../../lib/rechte'
import { KAMPAGNEN_STATUS, type KampagnenStatus } from '../../types'
import { zeitraum } from './KampagneAkte'

const RANG: Record<KampagnenStatus, number> = { laeuft: 0, vorbereitung: 1, idee: 2, abgeschlossen: 3 }

/**
 * Kampagnen (oder nur Messen & Events): je Zeile Stand, Zeitraum, Leads gegen Ziel, Aufträge und Auftragswert, mit
 * Recht auch Kosten und Kosten pro Lead. Laufende und geplante zuerst; Klick öffnet die Akte.
 */
export function KampagnenListe({
  nurMessen = false,
  onOeffnen,
}: {
  nurMessen?: boolean
  onOeffnen: (id: string | 'neu') => void
}) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const liste = useWerbekampagnen()
  const zahlen = useKampagnenZahlen().data ?? []
  const [status, setStatus] = useState<string[]>(['idee', 'vorbereitung', 'laeuft'])
  if (liste.error) return <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
  const alle = (liste.data ?? []).filter((k) => (nurMessen ? k.art === 'messe' : true))
  const gezeigt = alle
    .filter((k) => !status.length || status.includes(k.status))
    .sort((a, b) => RANG[a.status] - RANG[b.status])
  const z = (id: string) => zahlen.find((x) => x.kampagne_id === id)
  const kosten = kostenSichtbar(ich)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          beschriftung={t('werbung.feld.status')}
          optionen={KAMPAGNEN_STATUS.map((s) => ({
            wert: s,
            text: t(`werbung.status.${s}`),
            anzahl: alle.filter((k) => k.status === s).length,
          }))}
          gewaehlt={status}
          onChange={setStatus}
        />
        <Button
          onClick={() => {
            onOeffnen('neu')
          }}
        >
          <Plus />
          {nurMessen ? t('werbung.messe.neu') : t('werbung.kampagne.neu')}
        </Button>
      </div>
      {!liste.data ? (
        <Skelett className="h-64" />
      ) : gezeigt.length === 0 ? (
        <Leerzustand
          icon={nurMessen ? Tent : Flag}
          titel={nurMessen ? t('werbung.messe.leer') : t('werbung.kampagne.leer')}
          text={nurMessen ? t('werbung.messe.leerText') : t('werbung.kampagne.leerText')}
        />
      ) : (
        <Tabelle>
          <TabelleKopf>
            <Zeile>
              <Kopfzelle>{t('werbung.feld.name')}</Kopfzelle>
              <Kopfzelle>{t('werbung.feld.status')}</Kopfzelle>
              <Kopfzelle>{t('werbung.feld.zeitraum')}</Kopfzelle>
              <Kopfzelle zahl>{t('werbung.ergebnis.leads')}</Kopfzelle>
              <Kopfzelle zahl>{t('werbung.ergebnis.auftraege')}</Kopfzelle>
              <Kopfzelle zahl>{t('werbung.ergebnis.auftragswert')}</Kopfzelle>
              {kosten && <Kopfzelle zahl>{t('werbung.ergebnis.kostenKurz')}</Kopfzelle>}
              {kosten && <Kopfzelle zahl>{t('werbung.ergebnis.proLead')}</Kopfzelle>}
            </Zeile>
          </TabelleKopf>
          <TabelleKoerper>
            {gezeigt.map((k) => {
              const x = z(k.id)
              return (
                <Zeile
                  key={k.id}
                  className="cursor-pointer"
                  onClick={() => {
                    onOeffnen(k.id)
                  }}
                >
                  <Zelle>
                    <button type="button" className="text-left font-medium hover:underline">
                      {k.name}
                    </button>
                    <span className="text-muted-foreground block text-xs">
                      {nurMessen ? (k.details.ort ?? '') : t(`werbung.art.${k.art}`)}
                    </span>
                  </Zelle>
                  <Zelle>
                    <Badge ton={k.status === 'laeuft' ? 'ok' : k.status === 'abgeschlossen' ? 'neutral' : 'info'}>
                      {t(`werbung.status.${k.status}`)}
                    </Badge>
                  </Zelle>
                  <Zelle className="zahlen whitespace-nowrap">{zeitraum(k)}</Zelle>
                  <Zelle zahl>
                    {x?.leads ?? 0}
                    {k.ziel_leads ? <span className="text-muted-foreground"> / {k.ziel_leads}</span> : null}
                  </Zelle>
                  <Zelle zahl>{x?.auftraege ?? 0}</Zelle>
                  <Zelle zahl>{x?.auftragswert_rappen ? formatChf(x.auftragswert_rappen) : '–'}</Zelle>
                  {kosten && <Zelle zahl>{x?.kosten_rappen ? formatChf(x.kosten_rappen) : '–'}</Zelle>}
                  {kosten && (
                    <Zelle zahl>
                      {x?.kosten_rappen && x.leads ? formatChf(Math.round(x.kosten_rappen / x.leads)) : '–'}
                    </Zelle>
                  )}
                </Zeile>
              )
            })}
          </TabelleKoerper>
        </Tabelle>
      )}
    </div>
  )
}
