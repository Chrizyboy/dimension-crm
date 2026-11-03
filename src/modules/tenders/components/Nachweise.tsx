import { FileText, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InPapierkorbKnopf } from '@/components/shared/papierkorb/InPapierkorbKnopf'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { useUi } from '@/stores/ui'
import { useNachweise, useRegeln } from '../hooks/useSubmission'
import { tageBis } from '../lib/anzeige'
import { nachweisLink } from '../services/submission'
import type { Nachweis } from '../types'
import { Box } from './Box'
import { NachweisDialog } from './NachweisDialog'
import { Referenzen } from './Referenzen'

/** Ton eines Nachweises: abgelaufen rot, in den nächsten 30 Tagen orange, sonst grün. */
function ton(n: Nachweis | undefined): 'ok' | 'warnung' | 'kritisch' {
  const tage = n ? (tageBis(n.gueltig_bis) ?? -1) : -1
  return tage < 0 ? 'kritisch' : tage <= 30 ? 'warnung' : 'ok'
}

/**
 * Nachweise und Referenzen: für jede Firma (Muri, Bulle) jeder Nachweis, den Vergabestellen verlangen, mit
 * Gültigkeit. 30 Tage vor Ablauf kommt eine Aufgabe «Nachweis erneuern» (Zeitplan). Darunter die Referenzliste.
 */
export function Nachweise() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const daten = useNachweise()
  const arten = useRegeln().data?.nachweise ?? []
  const [neu, setNeu] = useState<{ firma_id: string; art: string } | null | 'leer'>(null)

  async function oeffnen(pfad: string) {
    try {
      window.open(await nachweisLink(pfad), '_blank', 'noopener')
    } catch (e) {
      meldeFehler(e, 'ausschreibungen')
    }
  }

  if (daten.error) return <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
  if (!daten.data) return <Skelett className="h-96" />
  const { nachweise, firmen } = daten.data
  const aktuell = (firma: string, art: string) => nachweise.find((n) => n.firma_id === firma && n.art === art)

  return (
    <div className="flex flex-col gap-4">
      <Box
        titel={t('ausschreibungen.nachweise.titel')}
        rechts={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setNeu('leer')
            }}
          >
            <Plus />
            {t('ausschreibungen.nachweise.neu')}
          </Button>
        }
      >
        <p className="text-muted-foreground text-xs">{t('ausschreibungen.nachweise.hilfe')}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="text-muted-foreground text-left text-xs">
                <th className="py-1.5 pr-3 font-medium">{t('ausschreibungen.nachweise.art')}</th>
                {firmen.map((f) => (
                  <th key={f.id} className="py-1.5 pr-3 font-medium">
                    {f.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {arten.map((a) => (
                <tr key={a.art} className="border-t">
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                    {sprache === 'fr' ? a.fr : a.de}
                    <span className="text-muted-foreground block text-xs">
                      {t('ausschreibungen.monate', { count: a.monate })}
                    </span>
                  </th>
                  {firmen.map((f) => {
                    const n = aktuell(f.id, a.art)
                    const pfad = n?.datei_pfad
                    return (
                      <td key={f.id} className="py-1.5 pr-3">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Badge ton={ton(n)}>
                            {n
                              ? t('ausschreibungen.nachweise.bis', { datum: formatDatum(n.gueltig_bis) })
                              : t('ausschreibungen.nachweise.fehlt')}
                          </Badge>
                          {pfad && (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={t('ausschreibungen.nachweise.oeffnen')}
                              onClick={() => void oeffnen(pfad)}
                            >
                              <FileText />
                            </Button>
                          )}
                          {n && (
                            <InPapierkorbKnopf
                              tabelle="firmen_nachweise"
                              id={n.id}
                              name={`${sprache === 'fr' ? a.fr : a.de} ${f.name}`}
                              nurSymbol
                            />
                          )}
                          {ton(n) !== 'ok' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setNeu({ firma_id: f.id, art: a.art })
                              }}
                            >
                              {t('ausschreibungen.nachweise.erneuern')}
                            </Button>
                          )}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>
      <Referenzen />
      {neu && (
        <NachweisDialog
          firmen={firmen}
          arten={arten}
          {...(neu !== 'leer' ? { vorgabe: neu } : {})}
          onSchliessen={() => {
            setNeu(null)
          }}
        />
      )}
    </div>
  )
}
