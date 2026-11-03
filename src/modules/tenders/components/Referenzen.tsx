import { Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { useAktion } from '../hooks/useAktion'
import { useReferenzen, useReferenzVorschlaege } from '../hooks/useSubmission'
import { referenzEntfernen, referenzSpeichern } from '../services/submission'
import type { Referenz } from '../types'
import { Box } from './Box'
import { ReferenzDialog } from './ReferenzDialog'

/**
 * Referenzliste für Eingaben: Projekte mit Leistung, Jahr, Auftraggeber und Ansprechperson, die angefragt werden
 * darf («freigegeben»). Vorschläge kommen aus Projekten mit Inbetriebnahme, übernommen wird erst per Klick.
 */
export function Referenzen() {
  const { t } = useTranslation()
  const liste = useReferenzen()
  const [vorschlaege, setVorschlaege] = useState(false)
  const vor = useReferenzVorschlaege(vorschlaege)
  const [bearbeiten, setBearbeiten] = useState<Partial<Referenz> | null>(null)
  const { laeuft, aus } = useAktion()

  return (
    <Box
      titel={t('ausschreibungen.referenzen.titel')}
      rechts={
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setVorschlaege(!vorschlaege)
            }}
          >
            <Sparkles />
            {t('ausschreibungen.referenzen.ausProjekten')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setBearbeiten({ sprache: 'de', freigegeben: false })
            }}
          >
            <Plus />
            {t('ausschreibungen.referenzen.neu')}
          </Button>
        </>
      }
    >
      {vorschlaege && (
        <div className="bg-muted/60 flex flex-col gap-1 rounded-md p-2">
          <p className="text-muted-foreground text-xs">{t('ausschreibungen.referenzen.vorschlagHilfe')}</p>
          {vor.isPending ? (
            <Skelett className="h-16" />
          ) : (vor.data ?? []).length === 0 ? (
            <p className="text-sm">{t('ausschreibungen.referenzen.keineVorschlaege')}</p>
          ) : (
            <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
              {(vor.data ?? []).map((v) => (
                <li key={v.projekt_id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    {v.titel}{' '}
                    <span className="text-muted-foreground text-xs">
                      · {[v.ort, v.leistung_kwp ? `${v.leistung_kwp} kWp` : null, v.jahr].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setBearbeiten({
                        projekt_id: v.projekt_id,
                        titel: v.titel,
                        ort: v.ort,
                        leistung_kwp: v.leistung_kwp,
                        jahr: v.jahr,
                        auftraggeber: v.auftraggeber,
                        sprache: v.sprache === 'fr' ? 'fr' : 'de',
                        freigegeben: false,
                      })
                    }}
                  >
                    {t('ausschreibungen.referenzen.uebernehmen')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {liste.isPending ? (
        <Skelett className="h-40" />
      ) : (liste.data ?? []).length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('ausschreibungen.referenzen.leer')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="text-muted-foreground text-left text-xs">
                <th className="py-1.5 pr-3 font-medium">{t('ausschreibungen.referenzen.projekt')}</th>
                <th className="py-1.5 pr-3 text-right font-medium">kWp</th>
                <th className="py-1.5 pr-3 font-medium">{t('ausschreibungen.referenzen.jahr')}</th>
                <th className="py-1.5 pr-3 font-medium">{t('ausschreibungen.referenzen.auftraggeber')}</th>
                <th className="py-1.5 pr-3 font-medium">{t('ausschreibungen.referenzen.anfragen')}</th>
                <th className="sr-only">{t('ausschreibungen.referenzen.aktionen')}</th>
              </tr>
            </thead>
            <tbody>
              {(liste.data ?? []).map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-1.5 pr-3">
                    {r.titel}
                    <span className="text-muted-foreground block text-xs">
                      {[r.ort, r.gebaeude].filter(Boolean).join(' · ')}
                    </span>
                  </td>
                  <td className="zahlen py-1.5 pr-3 text-right">{r.leistung_kwp ?? '–'}</td>
                  <td className="zahlen py-1.5 pr-3">{r.jahr ?? '–'}</td>
                  <td className="py-1.5 pr-3">
                    {r.auftraggeber ?? '–'}
                    {r.ansprechperson && (
                      <span className="text-muted-foreground block text-xs">
                        {[r.ansprechperson, r.telefon].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3">
                    <Badge ton={r.freigegeben ? 'ok' : 'neutral'}>
                      {t(r.freigegeben ? 'ausschreibungen.referenzen.ja' : 'ausschreibungen.referenzen.nein')}
                    </Badge>
                  </td>
                  <td className="py-1.5 text-right whitespace-nowrap">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t('ausschreibungen.akte.bearbeiten')}
                      onClick={() => {
                        setBearbeiten(r)
                      }}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={laeuft}
                      aria-label={t('ausschreibungen.protokoll.entfernen')}
                      onClick={() =>
                        void aus(() => referenzEntfernen(r.id), {
                          de: 'In den Papierkorb gelegt',
                          fr: 'Mis à la corbeille',
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {bearbeiten && (
        <ReferenzDialog
          referenz={bearbeiten}
          laeuft={laeuft}
          onSchliessen={() => {
            setBearbeiten(null)
          }}
          onSpeichern={async (r) => {
            if (await aus(() => referenzSpeichern(r), { de: 'Referenz gespeichert', fr: 'Référence enregistrée' }))
              setBearbeiten(null)
          }}
        />
      )}
    </Box>
  )
}
